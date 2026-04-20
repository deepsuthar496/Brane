const { streamText } = require("ai");
const providerManager = require("./provider");
const { getTools } = require("./tools");
const fs = require("fs/promises");
const path = require("path");

const DEFAULT_SYSTEM_PROMPT = `You are BraneZO, a highly capable, autonomous AI coding assistant integrated directly into the Brane Hub desktop IDE.

# Core Identity
- You are an expert software engineer.
- You have direct access to the user's workspace filesystem and terminal.
- You are proactive and action-oriented. When a coding task is requested, you use your tools to explore the codebase, write code, run tests, and fix errors yourself.

# When to Use Tools vs. When to Respond with Text
- For greetings, general questions, explanations, brainstorming, or any conversational message: **respond with text only**. Do NOT call any tools.
- For coding tasks (fixing bugs, writing code, reading files, running commands): use the appropriate tools.
- If unsure whether a tool is needed, default to a text response and ask the user for clarification.
- NEVER call a tool without a clear, specific purpose. Each tool call MUST have valid, complete arguments.

# Tool Usage & Methodology (for coding tasks only)
- Before editing code, always use \`read_file\` or \`grep_search\` to understand the surrounding context.
- When making targeted changes, prefer \`edit_file\` (replace) over overwriting the entire file, unless it's a new file or a complete rewrite.
- Use \`run_bash\` ONLY for terminal operations (tests, linters, git commands, build scripts, npm commands). NEVER use \`run_bash\` without a specific command string.
- Chain your tool calls effectively. For example, search for a symbol, read the file, edit the file, and then run a linter or test suite to verify the change.

# Execution Guidelines
1. **Understand first:** If a request is vague, use tools to explore the codebase (glob_search, grep_search) to locate relevant files before acting.
2. **Be concise:** The user can see your tool calls and diffs. Do not narrate your thought process extensively. Keep your text responses brief, focusing on what decisions you made, what you found, and what the user needs to know.
3. **Verify your work:** After editing code, if there are tests, run them. If there's a build step, run it. Don't assume your code works on the first try.
4. **Safety first:** Do not execute destructive terminal commands (like deleting databases or force-pushing to git) without explicit user permission.

# Formatting
- Use markdown for text responses.
- When referencing file paths, use relative paths from the workspace root.
- Keep your tone professional, helpful, and direct.`;

async function getSkillsPrompt() {
  try {
    const appRoot = path.resolve(__dirname, "../../");
    const skillsLockPath = path.join(appRoot, "skills-lock.json");
    const lockData = await fs.readFile(skillsLockPath, "utf-8");
    const lockJson = JSON.parse(lockData);
    
    if (!lockJson.installed || !lockJson.installed.skills) return "";
    
    const installedSkills = Object.keys(lockJson.installed.skills).filter(name => lockJson.installed.skills[name].enabled !== false);
    if (installedSkills.length === 0) return "";
    
    let skillsXml = "\n\n<available_skills>\n";
    for (const name of installedSkills) {
      skillsXml += `  <skill>\n    <name>${name}</name>\n    <description>Specialized instructions for ${name} tasks.</description>\n  </skill>\n`;
    }
    skillsXml += "</available_skills>\n\nUse the `activate_skill` tool when a task matches a skill's description to load its workflow instructions.";
    return skillsXml;
  } catch (e) {
    return "";
  }
}

async function processMentions(messages, workspacePath) {
  if (!messages || messages.length === 0) return [];
  
  // Transform Frontend UI ChatMessages (which contain .toolUse) into Vercel SDK CoreMessages
  const coreMessages = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (msg.role === "user") {
      const content = typeof msg.content === "string" ? msg.content : "";
      if (coreMessages.length > 0 && coreMessages[coreMessages.length - 1].role === "user") {
        coreMessages[coreMessages.length - 1].content += "\n\n" + content;
      } else {
        coreMessages.push({ role: "user", content: content });
      }
    } else if (msg.role === "assistant") {
      // If content is already an array of parts, trust it (standard SDK format)
      if (Array.isArray(msg.content)) {
        coreMessages.push({ role: "assistant", content: msg.content.filter((part) => part.type !== "tool-approval-request" && part.type !== "tool-approval-response") });
      } else {
        // UI-style message: convert to parts
        const assistantParts = [];
        if (msg.content && typeof msg.content === "string") {
          assistantParts.push({ type: "text", text: msg.content });
        }

        const toolResults = [];
        if (msg.toolUse && Array.isArray(msg.toolUse)) {
          for (const t of msg.toolUse) {
            const callId = t.id || `call-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            
            assistantParts.push({
              type: "tool-call",
              toolCallId: callId,
              toolName: t.toolName || "unknown_tool",
              args: typeof t.input === "string" ? (() => { try { return JSON.parse(t.input); } catch(e) { return {}; } })() : (t.input || {}),
            });

            if (t.status === "success" || t.status === "error" || t.output) {
              // AI SDK v6 requires output: { type: 'text', value: string } NOT result: string
              toolResults.push({
                type: "tool-result",
                toolCallId: callId,
                toolName: t.toolName || "unknown_tool",
                output: {
                  type: t.status === "error" ? "error-text" : "text",
                  value: String(t.output || "Completed")
                }
              });
            }
          }
        }

        // Only push assistant message if it has content (text or tool calls)
        if (assistantParts.length > 0) {
          coreMessages.push({ role: "assistant", content: assistantParts });
        }
        if (toolResults.length > 0) {
          coreMessages.push({ role: "tool", content: toolResults });
        }
      }
    } else if (msg.role === "tool") {
      // Direct passthrough for tool result messages already in SDK format
      if (Array.isArray(msg.content)) {
        coreMessages.push({ role: "tool", content: msg.content.filter((part) => part.type !== "tool-approval-request" && part.type !== "tool-approval-response") });
      } else {
        coreMessages.push({ role: "tool", content: msg.content });
      }
    }
  }
  
  const processedMessages = [...coreMessages];
  const latestMessage = processedMessages[processedMessages.length - 1];
  
  if (latestMessage && latestMessage.role === "user" && typeof latestMessage.content === "string") {
    const quotedRegex = /(^|\s)@"([^"]+)"/g;
    const regularRegex = /(^|\s)@([^\s]+)\b/g;
    
    const mentions = new Set();
    let match;
    
    while ((match = quotedRegex.exec(latestMessage.content)) !== null) {
      mentions.add(match[2]);
    }
    
    const regularMatches = latestMessage.content.match(regularRegex) || [];
    for (const m of regularMatches) {
      const filename = m.slice(m.indexOf('@') + 1);
      if (!filename.startsWith('"')) {
        mentions.add(filename);
      }
    }
    
    if (mentions.size > 0) {
      let attachmentsContext = "\n\n<context>\n";
      for (const mention of mentions) {
        try {
          const absPath = path.resolve(workspacePath, mention);
          if (absPath.startsWith(path.resolve(workspacePath))) {
             const stat = await fs.stat(absPath);
             if (stat.isFile()) {
               const content = await fs.readFile(absPath, "utf-8");
               attachmentsContext += `---
source_file: "${mention}"
type: "code"
---
${content}

`;
             }
          }
        } catch (e) {
          // Ignore if file not found or cannot be read
        }
      }
      attachmentsContext += "</context>";
      
      if (attachmentsContext !== "\n\n<context>\n</context>") {
        latestMessage.content += attachmentsContext;
      }
    }
  }
  
  return processedMessages;
}

class AgentSession {
  constructor() {
    this.activeStreams = new Map();
  }

  async startChat({ id, messages, workspacePath, providerId, modelId, apiKey, systemPrompt }, onChunk, onToolCall, onToolResult, onFinish, onError) {
    if (this.activeStreams.has(id)) {
      this.abortChat(id);
    }

    const abortController = new AbortController();
    this.activeStreams.set(id, abortController);

    try {
      const model = await providerManager.getModel(providerId, modelId, apiKey);
      const tools = getTools(workspacePath);
      const skillsPrompt = await getSkillsPrompt();
      
      let currentMessages = await processMentions(messages, workspacePath);

      console.log(`\n[BraneZO]: Starting chat for session ${id}`);

      const result = streamText({
        model,
        messages: currentMessages,
        system: (systemPrompt || DEFAULT_SYSTEM_PROMPT) + skillsPrompt,
        tools,
        maxSteps: 10,
        toolChoice: "auto",
        abortSignal: abortController.signal,
        experimental_repairToolCall: async ({ toolCall, error, tools }) => {
          console.warn(`[BraneZO]: Repairing malformed tool call: ${toolCall.toolName}`, error);
          if (toolCall.args === undefined || toolCall.args === null || toolCall.args === "") {
            return { ...toolCall, args: "{}" };
          }
          return toolCall;
        },
        onError: (error) => {
          console.error("\n[BraneZO SDK Error]:", error);
        },
      });

      try {
        for await (const chunk of result.fullStream) {
          if (abortController.signal.aborted) break;
          
          switch (chunk.type) {
            case "step-start":
              console.log(`\n[BraneZO Step Start]`);
              break;
            case "text-delta":
              const txtValue = chunk.textDelta || chunk.text || "";
              process.stdout.write(txtValue);
              onChunk(txtValue);
              break;
            case "tool-call":
              console.log(`\n[BraneZO Tool Call]: ${chunk.toolName}(${JSON.stringify(chunk.args)})`);
              onToolCall({ id: chunk.toolCallId, name: chunk.toolName, args: chunk.args });
              break;
            case "tool-result":
              console.log(`\n[BraneZO Tool Result]: ${chunk.toolName} -> ${chunk.result?.error ? "ERROR" : "SUCCESS"}`);
              onToolResult({ id: chunk.toolCallId, name: chunk.toolName, result: chunk.result });
              break;
            case "step-finish":
              console.log(`\n[BraneZO Step Finish]: ${chunk.finishReason}`);
              break;
            case "error":
              console.error("\n[BraneZO Stream ERROR]:", chunk.error);
              throw chunk.error;
          }
        }
      } catch (streamErr) {
        if (streamErr?.name === 'AbortError' || abortController.signal.aborted) {
          console.log("\n[BraneZO]: Aborted.");
          return;
        }
        console.error("\n[BraneZO Stream Fatal Error]:", streamErr);
        throw streamErr;
      }

      if (abortController.signal.aborted) return;
      
      const finalResponse = await result.response;
      console.log("\n[BraneZO]: Response Complete.");
      
      // Pass the updated messages array to the frontend
      onFinish([...currentMessages, ...finalResponse.messages]);

    } catch (e) {
      if (e.name !== 'AbortError') {
        onError(e);
      }
    } finally {
      this.activeStreams.delete(id);
    }
  }

  abortChat(id) {
    const controller = this.activeStreams.get(id);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(id);
    }
  }
}

const sessionInstance = new AgentSession();
sessionInstance.AgentSession = AgentSession;
sessionInstance.processMentions = processMentions;
sessionInstance.agentSession = sessionInstance; // Self-reference for test compatibility

module.exports = sessionInstance;
