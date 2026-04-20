const { streamText } = require("ai");
const providerManager = require("./provider");
const { getTools } = require("./tools");
const fs = require("fs/promises");
const path = require("path");

const DEFAULT_SYSTEM_PROMPT = `You are BraneZO, a highly capable, autonomous AI coding assistant integrated directly into the Brane Hub desktop IDE.

# Core Identity
- You are an expert software engineer.
- You have direct access to the user's workspace filesystem and terminal.
- You are proactive and action-oriented. You don't just explain how to fix things; you use your tools to explore the codebase, write code, run tests, and fix errors yourself.

# Tool Usage & Methodology
- ALWAYS use the provided tools to interact with the system.
- Before editing code, always use \`read_file\` or \`grep_search\` to understand the surrounding context.
- When making targeted changes, prefer \`edit_file\` (replace) over overwriting the entire file, unless it's a new file or a complete rewrite.
- Use \`run_bash\` to run tests, linters, git commands, and build scripts.
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
  if (!messages || messages.length === 0) return messages;
  
  const processedMessages = [...messages];
  const latestMessage = processedMessages[processedMessages.length - 1];
  
  if (latestMessage.role === "user" && typeof latestMessage.content === "string") {
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
      const model = await providerManager.getModel(providerId, modelId);
      const tools = getTools(workspacePath);
      const skillsPrompt = await getSkillsPrompt();
      
      let currentMessages = await processMentions(messages, workspacePath);
      let step = 0;
      const MAX_STEPS = 10;
      let finalMessages = [];

      console.log(`\n[BraneZO]: Starting multi-step chat loop for session ${id}`);

      while (step < MAX_STEPS) {
        if (abortController.signal.aborted) break;
        step++;
        
        console.log(`\n[BraneZO]: turn ${step}...`);

        const result = streamText({
          model,
          messages: currentMessages,
          system: (systemPrompt || DEFAULT_SYSTEM_PROMPT) + skillsPrompt,
          tools,
          abortSignal: abortController.signal,
          maxSteps: 1, 
        });

        let assistantText = "";
        let hasToolCallsInThisStep = false;
        let toolCalls = [];
        let toolResults = [];
        let finishReason = "unknown";

        try {
          for await (const chunk of result.fullStream) {
            if (abortController.signal.aborted) break;
            
            switch (chunk.type) {
              case "text-delta":
                process.stdout.write(chunk.textDelta || chunk.text || "");
                onChunk(chunk.textDelta || chunk.text || "");
                assistantText += (chunk.textDelta || chunk.text || "");
                break;
              case "tool-call":
                hasToolCallsInThisStep = true;
                toolCalls.push(chunk);
                console.log(`\n[BraneZO Tool Call]: ${chunk.toolName}(${JSON.stringify(chunk.args)})`);
                onToolCall({ id: chunk.toolCallId, name: chunk.toolName, args: chunk.args });
                break;
              case "tool-result":
                toolResults.push(chunk);
                console.log(`\n[BraneZO Tool Result]: ${chunk.toolName} -> ${chunk.result?.error ? "ERROR" : "SUCCESS"}`);
                onToolResult({ id: chunk.toolCallId, name: chunk.toolName, result: chunk.result });
                break;
              case "finish":
                finishReason = chunk.finishReason;
                break;
              case "error":
                console.error("\n[BraneZO ERROR]:", chunk.error);
                throw chunk.error;
            }
          }
        } catch (streamErr) {
          console.error("\n[BraneZO Stream Error]:", streamErr);
          throw streamErr;
        }

        // Sync history
        let assistantContent = [];
        if (assistantText) {
           assistantContent.push({ type: "text", text: assistantText });
        }
        
        if (toolCalls.length > 0) {
           for (const tc of toolCalls) {
              assistantContent.push({
                 type: "tool-call",
                 toolCallId: tc.toolCallId,
                 toolName: tc.toolName,
                 args: tc.args
              });
           }
        }
        
        if (assistantContent.length > 0) {
          currentMessages.push({
            role: "assistant",
            content: assistantContent,
          });
        } else {
          currentMessages.push({
            role: "assistant",
            content: "",
          });
        }

        if (toolResults.length > 0) {
          const toolResultParts = toolResults.map(res => ({
            type: "tool-result",
            toolCallId: res.toolCallId,
            toolName: res.toolName,
            result: res.result
          }));
          
          currentMessages.push({
            role: "tool",
            content: toolResultParts
          });
        }

        finalMessages = currentMessages;

        // OpenCode logic: If there were tool calls, ALWAYS continue the loop to feed results back.
        // Break only if the model didn't call any tools (meaning it gave a final answer).
        if (!hasToolCallsInThisStep) {
          console.log(`\n[BraneZO]: finished naturally. Reason: ${finishReason}`);
          break;
        }
      }
      
      console.log("\n[BraneZO]: Response Complete.");
      onFinish(finalMessages);

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

module.exports = new AgentSession();
