import { streamText, tool, convertToModelMessages, stepCountIs, NoSuchToolError, InvalidToolInputError, getTextFromDataUrl } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createCerebras } from '@ai-sdk/cerebras';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
import { BraneIndexer } from '@/lib/indexer';
import { MCPManager } from '@/lib/mcp-manager';
import { SkillManager } from '@/lib/skills';
import { replace } from '@/lib/tools/edit-logic';
import { getGlobalLSPManager, type LSPManager } from '@/lib/lsp';

export const maxDuration = 60;

// ── Tool name registry for repair logic ──────────────────────────────────────
const NATIVE_TOOL_NAMES = [
  'askUser', 'listDirectory', 'readFile', 'writeFile', 'editFile', 
  'applyPatch', 'searchCodebase', 'getWorkspaceStructure', 'useSkill', 'readSkillFile',
  'spawnSubagent', 'listKnowledgeFiles', 'readKnowledgeFile', 'searchKnowledgeBase'
];

/**
 * Attempts to extract a clean tool name from a malformed tool call.
 */
function parseGarbledToolCall(rawName: string, allToolNames: string[]): { toolName: string; extractedArgs: Record<string, unknown> } | null {
  for (const name of allToolNames) {
    if (rawName.startsWith(name)) {
      const remainder = rawName.slice(name.length).trim();
      let extractedArgs: Record<string, unknown> = {};
      if (remainder) {
        try { extractedArgs = JSON.parse(remainder); } catch { /* ignore */ }
      }
      return { toolName: name, extractedArgs };
    }
  }
  return null;
}

export async function POST(req: Request) {
  let mcpManager: MCPManager | null = null;
  let lspManager: LSPManager | null = null;
  const KNOWLEDGE_BASE_DIR = path.join(os.homedir(), '.brane', 'knowledge');

  try {
    const { 
      messages, 
      model: modelStr, 
      codebaseIndexerEnabled, 
      memoryEnabled, 
      workspaceRoot: customWorkspaceRoot,
      buildMode = 'Build',
      creativeMode = 'Default'
    } = await req.json();

    if (!modelStr || typeof modelStr !== 'string') {
      return new Response('Model is required', { status: 400 });
    }

    console.log(`[Chat API] --- NEW REQUEST ---`);
    console.log(`[Chat API] Mode: ${buildMode}, Model: ${modelStr}`);

    const temperatureMap: Record<string, number> = { 'Default': 0.7, 'Creative': 1.0, 'Precise': 0.1 };
    const temperature = temperatureMap[creativeMode] ?? 0.7;

    // ── Process messages (AI SDK v6 format) ──────────────────────────────────
    const processedMessages = messages.map((msg: any) => {
      if (msg.parts && Array.isArray(msg.parts)) {
        if (msg.role === 'user') {
          const newParts: any[] = [];
          for (const part of msg.parts) {
            if (part.type === 'file') {
              const mediaType = part.mediaType || '';
              const url = part.url || '';
              if (mediaType.startsWith('image/')) {
                newParts.push(part);
              } else if (url.startsWith('data:')) {
                try {
                  const text = getTextFromDataUrl(url);
                  newParts.push({
                    type: 'text',
                    text: `\n\n### Attached File: ${part.filename || 'file'}\n\`\`\`\n${text}\n\`\`\``,
                  });
                } catch (e) { /* skip */ }
              }
            } else { newParts.push(part); }
          }
          return { ...msg, parts: newParts };
        }
        return msg;
      }
      if (typeof msg.content === 'string') {
        return { id: msg.id || crypto.randomUUID(), role: msg.role, parts: [{ type: 'text', text: msg.content }] };
      }
      return msg;
    });

    // ── Resolve Provider & Model ─────────────────────────────────────────────
    const [provider, ...modelParts] = modelStr.split('/');
    const modelId = modelParts.join('/');
    const groqApiKey = req.headers.get('x-groq-api-key') || process.env.GROQ_API_KEY;
    const cerebrasApiKey = req.headers.get('x-cerebras-api-key') || process.env.CEREBRAS_API_KEY;
    const openRouterApiKey = req.headers.get('x-openrouter-api-key') || process.env.OPENROUTER_API_KEY;
    const githubCopilotToken = req.headers.get('x-github-copilot-token') || process.env.GITHUB_COPILOT_TOKEN;

    let model;
    if (provider === 'groq') {
      if (!groqApiKey) return new Response('Groq API key is missing.', { status: 401 });
      model = createGroq({ apiKey: groqApiKey })(modelId);
    } else if (provider === 'cerebras') {
      if (!cerebrasApiKey) return new Response('Cerebras API key is missing.', { status: 401 });
      model = createCerebras({ apiKey: cerebrasApiKey })(modelId);
    } else if (provider === 'openrouter') {
      if (!openRouterApiKey) return new Response('OpenRouter API key is missing.', { status: 401 });
      model = createOpenRouter({ apiKey: openRouterApiKey })(modelId);
    } else if (provider === 'github-copilot') {
      if (!githubCopilotToken) return new Response('GitHub Copilot token is missing.', { status: 401 });
      model = createOpenAI({
        name: 'github-copilot', baseURL: 'https://api.githubcopilot.com', apiKey: githubCopilotToken,
        headers: { 'User-Agent': 'Brane/0.1.0', 'x-initiator': 'user', 'Openai-Intent': 'conversation-edits' }
      }).chat(modelId);
    } else { return new Response('Unsupported provider: ' + provider, { status: 400 }); }

    const workspaceRoot = customWorkspaceRoot || process.cwd();
    const indexer = codebaseIndexerEnabled ? new BraneIndexer(workspaceRoot) : null;

    // ── Initialize LSP Manager ──────────────────────────────────────────────
    lspManager = getGlobalLSPManager(workspaceRoot);
    console.log(`[Chat API] LSP Manager initialized for workspace: ${workspaceRoot}`);

    // ── Knowledge Base Logic ───────────────────────────────────────────────
    const knowledgeMetadataFile = path.join(KNOWLEDGE_BASE_DIR, 'metadata.json');
    let knowledgeMetadata: Record<string, any> = {};
    try {
      const metaContent = await fs.readFile(knowledgeMetadataFile, 'utf-8');
      knowledgeMetadata = JSON.parse(metaContent);
    } catch { /* skip */ }

    async function scanKnowledgeDir(dir: string, subDir = ''): Promise<string[]> {
      const base = path.join(dir, subDir);
      const entries = await fs.readdir(base, { withFileTypes: true });
      const files: string[] = [];
      
      for (const entry of entries) {
        if (entry.name === 'metadata.json') continue;
        const relPath = subDir ? path.join(subDir, entry.name) : entry.name;
        if (entry.isDirectory()) {
          files.push(...(await scanKnowledgeDir(dir, relPath)));
        } else {
          // Calculate ID for metadata lookup (matches electron/knowledge-manager.js)
          const fullPath = path.join(dir, relPath);
          const crypto = require('crypto');
          const id = crypto.createHash('md5').update(fullPath).digest('hex');
          const desc = knowledgeMetadata[id]?.description ? ` (${knowledgeMetadata[id].description})` : '';
          files.push(`${relPath}${desc}`);
        }
      }
      return files;
    }

    let knowledgeFiles: string[] = [];
    try {
      knowledgeFiles = await scanKnowledgeDir(KNOWLEDGE_BASE_DIR);
    } catch { /* skip */ }

    const knowledgeContext = knowledgeFiles.length > 0 
      ? `\n## Global Knowledge Base\nYou have access to a shared intelligence layer organized into collections. Here are the available files and their descriptions:\n${knowledgeFiles.map(f => `- ${f}`).join('\n')}\nUse the \`readKnowledgeFile\` tool to read the contents of any of these files. Always prefer files with descriptions that match your current task.`
      : '';

    // ── Memory Logic ───────────────────────────────────────────────────────
    let memoryContext = '';
    if (memoryEnabled) {
      try {
        const memoryContent = await fs.readFile(path.join(workspaceRoot, '.brane', 'memory.md'), 'utf-8');
        memoryContext = `\n## Persistent Memory\n<memory>\n${memoryContent}\n</memory>`;
      } catch { /* skip */ }
    }

    mcpManager = new MCPManager(workspaceRoot);
    await mcpManager.connectAll();
    const mcpTools = mcpManager.getAllTools();
    const mcpToolNames = mcpManager.getToolNames();

    const skillManager = new SkillManager(workspaceRoot);
    await skillManager.discover();
    const skillPromptSection = skillManager.formatForPrompt();

    // ── System Prompt ────────────────────────────────────────────────────────
    const systemPromptBase = buildMode === 'Plan' 
      ? `## CURRENT MODE: PLAN (READ-ONLY)\nYou are Brainzo (Plan Agent). READ-ONLY mode. Focus on analysis and writing a plan. DO NOT CALL editFile, writeFile, or bash.`
      : `## CURRENT MODE: BUILD (READ-WRITE)\nYou are Brainzo (Build Agent). You have full permission to read and modify the codebase.`;

    const systemPrompt = [
      systemPromptBase, '', '# Core Mandates',
      '- Autonomous Resolution: Continue until the problem is solved and verified.',
      '- Thorough Thinking: Plan extensively before making tool calls.',
      '- **Mandatory Follow-up:** After EVERY tool call, you MUST provide a text response explaining what you found.',
      '', '# Capabilities',
      '- File Awareness: You can see and process files attached by the user.',
      '', ...(skillPromptSection ? [skillPromptSection, ''] : []),
      ...(memoryContext ? [memoryContext, ''] : []),
      ...(knowledgeContext ? [knowledgeContext, ''] : []),
      '## Workflow',
      '1. Understand 2. Investigate 3. Research 4. Plan 5. Implement (Build only) 6. Verify 7. Finalize',
    ].join('\n');

    // ── Native tool definitions ────────────────────────────────────────────
    const nativeToolDefs: Record<string, any> = {
      askUser: tool({
        description: 'Ask the user a question.',
        inputSchema: z.object({
          question: z.string(),
          options: z.array(z.object({ label: z.string(), description: z.string().optional() })).optional()
        })
      }),
      requestPlanApproval: tool({
        description: 'Ask for plan approval.',
        inputSchema: z.object({
          title: z.string(), summary: z.string(),
          steps: z.array(z.object({ title: z.string(), description: z.string().optional() }))
        })
      }),
      ...(codebaseIndexerEnabled ? {
        searchCodebase: tool({
          description: 'Search semantic index.',
          inputSchema: z.object({ query: z.string() }),
          execute: async ({ query }) => {
            if (!indexer) return 'Indexer not initialized';
            const results = await indexer.search(query);
            return results.length === 0 ? 'No matching symbols.' : results.map(r => `[${r.kind.toUpperCase()}] ${r.name} at ${r.filePath}:${r.line}`).join('\n');
          }
        }),
        getWorkspaceStructure: tool({
          description: 'Get directory tree.',
          inputSchema: z.object({ path: z.string() }),
          execute: async ({ path: targetPath }) => indexer ? await indexer.getStructure(targetPath) : 'Indexer not initialized'
        })
      } : {}),
      listDirectory: tool({
        description: 'List files in workspace.',
        inputSchema: z.object({ path: z.string() }),
        execute: async ({ path: targetPath }) => {
          const fullPath = path.resolve(workspaceRoot, targetPath);
          if (!fullPath.startsWith(workspaceRoot)) return 'Access denied';
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          return entries.map(entry => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`).join('\n') || '(empty)';
        }
      }),
      readFile: tool({
        description: 'Read workspace file.',
        inputSchema: z.object({ path: z.string() }),
        execute: async ({ path: targetPath }) => {
          const fullPath = path.resolve(workspaceRoot, targetPath);
          if (!fullPath.startsWith(workspaceRoot)) return 'Access denied';
          return await fs.readFile(fullPath, 'utf-8');
        }
      }),
      writeFile: tool({
        description: 'Write workspace file.',
        inputSchema: z.object({ path: z.string(), content: z.string() }),
        execute: async ({ path: targetPath, content }) => {
          if (buildMode === 'Plan') return 'REJECTED: PLAN mode is read-only.';
          const fullPath = path.resolve(workspaceRoot, targetPath);
          if (!fullPath.startsWith(workspaceRoot)) return 'Access denied';
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');

          // LSP: Touch the file and check for diagnostics
          let output = `Successfully written to ${targetPath}`;
          if (lspManager) {
            try {
              await lspManager.touchFile(fullPath, true);
              output = lspManager.formatFullOutput(fullPath, output);
            } catch (e: any) {
              console.error('[LSP] Error during writeFile diagnostics:', e.message);
            }
          }
          return output;
        }
      }),
      editFile: tool({
        description: 'Exact string replacement.',
        inputSchema: z.object({ filePath: z.string(), oldString: z.string(), newString: z.string(), replaceAll: z.boolean().optional() }),
        execute: async ({ filePath, oldString, newString, replaceAll }) => {
          if (buildMode === 'Plan') return 'REJECTED: PLAN mode is read-only.';
          const fullPath = path.resolve(workspaceRoot, filePath);
          if (!fullPath.startsWith(workspaceRoot)) return 'Access denied';
          const content = await fs.readFile(fullPath, 'utf-8');
          const updated = replace(content, oldString, newString, !!replaceAll);
          await fs.writeFile(fullPath, updated, 'utf-8');

          // LSP: Touch the file and check for diagnostics
          let output = `Edit applied to ${filePath}`;
          if (lspManager) {
            try {
              await lspManager.touchFile(fullPath, true);
              output = lspManager.formatFileOutput(fullPath, output);
            } catch (e: any) {
              console.error('[LSP] Error during editFile diagnostics:', e.message);
            }
          }
          return output;
        }
      }),
      bash: tool({
        description: 'Run terminal command.',
        inputSchema: z.object({ command: z.string(), workdir: z.string().optional() }),
        execute: async ({ command, workdir }) => {
          if (buildMode === 'Plan') return 'REJECTED: PLAN mode is read-only.';
          const cwd = workdir ? path.resolve(workspaceRoot, workdir) : workspaceRoot;
          if (!cwd.startsWith(workspaceRoot)) return 'Access denied';
          const { stdout, stderr } = await execAsync(command, { cwd, shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash' });
          return `STDOUT:\n${stdout}\nSTDERR:\n${stderr}`;
        }
      }),
      readKnowledgeFile: tool({
        description: 'Read a global knowledge file. Use the full relative path including collection name if applicable.',
        inputSchema: z.object({ path: z.string() }),
        execute: async ({ path: relPath }) => {
          try {
            const content = await fs.readFile(path.join(KNOWLEDGE_BASE_DIR, relPath), 'utf-8');
            return content.length > 50000 ? content.substring(0, 50000) + '\n\n[TRUNCATED]' : content;
          } catch (e: any) { return `Error: ${e.message}`; }
        }
      }),
      useSkill: tool({
        description: 'Load a skill.',
        inputSchema: z.object({ name: z.string() }),
        execute: async ({ name }) => {
          const skill = skillManager.get(name);
          if (!skill) return 'Skill not found.';
          return `# Skill: ${skill.name}\n\n[NOTE: This skill may reference additional files (e.g. 'references/...'). Use the \`readSkillFile\` tool with skillName="${skill.name}" to read them.]\n\n${skill.content}`;
        }
      }),
      readSkillFile: tool({
        description: 'Read a supporting file from a loaded skill. Provide the skill name and the relative path to the file within the skill directory.',
        inputSchema: z.object({ skillName: z.string(), filePath: z.string() }),
        execute: async ({ skillName, filePath }) => {
          const skill = skillManager.get(skillName);
          if (!skill) return 'Skill not found.';
          const skillDir = path.dirname(skill.location);
          const fullPath = path.resolve(skillDir, filePath);
          if (!fullPath.startsWith(skillDir)) return 'Access denied (path traversal).';
          try {
            return await fs.readFile(fullPath, 'utf-8');
          } catch (e: any) {
            return `Error: ${e.message}`;
          }
        }
      })
    };

    const allTools = { ...nativeToolDefs, ...mcpTools };
    const allToolNames = Object.keys(allTools);

    const repairToolCallLogic = async ({ toolCall, tools, error }: any) => {
      if (NoSuchToolError.isInstance(error)) {
        const parsed = parseGarbledToolCall(toolCall.toolName, allToolNames);
        if (parsed && parsed.toolName in tools) {
          const existingInput = typeof toolCall.input === 'string' ? (() => { try { return JSON.parse(toolCall.input); } catch { return {}; } })() : (toolCall.input || {});
          return { type: 'tool-call' as const, toolCallId: toolCall.toolCallId, toolName: parsed.toolName, input: JSON.stringify({ ...existingInput, ...parsed.extractedArgs }) };
        }
      }
      if (InvalidToolInputError.isInstance(error)) {
        const jsonMatch = (typeof toolCall.input === 'string' ? toolCall.input : JSON.stringify(toolCall.input)).match(/\{[\s\S]*\}/);
        if (jsonMatch) return { type: 'tool-call' as const, toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, input: jsonMatch[0] };
      }
      return null;
    };

    const result = streamText({
      model, system: systemPrompt, messages: await convertToModelMessages(processedMessages),
      tools: allTools, temperature,
      stopWhen: stepCountIs(10),
      experimental_repairToolCall: repairToolCallLogic,
      onStepFinish: (event: any) => {
        console.log(`[Chat API] Step done. Tools: ${event.toolCalls?.map((c: any) => c.toolName).join(', ') || 'None'}`);
      },
      onFinish: async () => {
        if (mcpManager) await mcpManager.closeAll().catch(() => {});
        // Do not shutdown lspManager here so it persists for the UI diagnostics poll
      }
    } as any);

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(error.message || 'Server error', { status: 500 });
  }
}
