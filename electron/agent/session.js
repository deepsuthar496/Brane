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
      const processedMessages = await processMentions(messages, workspacePath);

      const result = streamText({
        model,
        messages: processedMessages,
        system: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        tools,
        abortSignal: abortController.signal,
        maxSteps: 15, // Allow multiple tool turns automatically
        onStepFinish: (event) => {
           if (event.toolCalls && event.toolCalls.length > 0) {
             for (const call of event.toolCalls) {
               console.log(`\n[BraneZO Tool Call]: ${call.toolName}(${JSON.stringify(call.args)})`);
               onToolCall({
                 id: call.toolCallId,
                 name: call.toolName,
                 args: call.args
               });
             }
           }
           if (event.toolResults && event.toolResults.length > 0) {
             for (const res of event.toolResults) {
               console.log(`\n[BraneZO Tool Result]: ${res.toolName} -> ${res.result?.error ? "ERROR" : "SUCCESS"}`);
               onToolResult({
                 id: res.toolCallId,
                 name: res.toolName,
                 result: res.result
               });
             }
           }
        }
      });

      for await (const chunk of result.fullStream) {
        if (abortController.signal.aborted) break;
        
        switch (chunk.type) {
          case "text-delta":
            process.stdout.write(chunk.text || "");
            onChunk(chunk.text || "");
            break;
          case "tool-call":
            // Tool call started, but onStepFinish will handle the IPC event
            break;
          case "tool-result":
            // Tool result arrived, but onStepFinish will handle the IPC event
            break;
          case "error":
            console.error("\n[BraneZO ERROR]:", chunk.error);
            throw chunk.error;
        }
      }
      
      console.log("\n[BraneZO]: Response Complete."); // Ensure final newline
      onFinish(await result.messages);
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
