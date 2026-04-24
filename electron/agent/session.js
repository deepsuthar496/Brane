const { streamText } = require("ai");
const providerManager = require("./provider");
const { getTools } = require("./tools");
const fs = require("fs/promises");
const path = require("path");

const DEFAULT_SYSTEM_PROMPT = `You are BraneZO, an autonomous AI coding assistant.
You explore the codebase, write code, and verify changes autonomously.

# Guidelines
- Use tools to gather facts before acting.
- Chain tools (search -> read -> edit -> verify).
- ALWAYS provide a final text response synthesizing your work.
- If a tool result is empty or unexpected, try a different approach (e.g., use grep if glob fails).
- Be precise with file paths and search patterns.`;

async function getSkillsPrompt() {
  try {
    const appRoot = path.resolve(__dirname, "../../");
    const lock = JSON.parse(await fs.readFile(path.join(appRoot, "skills-lock.json"), "utf-8"));
    const installed = Object.keys(lock.installed?.skills || {}).filter(n => lock.installed.skills[n].enabled !== false);
    if (installed.length === 0) return "";
    let xml = "\n\n<available_skills>\n";
    for (const name of installed) xml += `  <skill><name>${name}</name></skill>\n`;
    xml += "</available_skills>\n\nUse \`activate_skill\` when appropriate.";
    return xml;
  } catch (e) { return ""; }
}

/**
 * Maps UI messages to AI SDK CoreMessages.
 * UI messages have a structure where tool calls and results are often nested
 * or stored in custom formats. We need to flatten them into the standard
 * assistant/tool message sequence.
 */
function mapToCoreMessages(uiMessages) {
  const coreMessages = [];

  for (const msg of uiMessages) {
    if (msg.role === "user") {
      coreMessages.push({
        role: "user",
        content: msg.content || "Continue",
      });
    } else if (msg.role === "assistant") {
      // 1. Add the assistant's text and tool calls
      const assistantContent = [];
      if (msg.content) {
        assistantContent.push({ type: "text", text: msg.content });
      }

      if (msg.toolUse && Array.isArray(msg.toolUse)) {
        for (const t of msg.toolUse) {
          assistantContent.push({
            type: "tool-call",
            toolCallId: t.id,
            toolName: t.toolName,
            args: typeof t.input === "string" ? (() => { try { return JSON.parse(t.input); } catch(e) { return {}; } })() : (t.input || {}),
          });
        }
      }

      if (assistantContent.length > 0) {
        coreMessages.push({
          role: "assistant",
          content: assistantContent,
        });
      }

      // 2. Add the corresponding tool results as a separate 'tool' message
      if (msg.toolUse && Array.isArray(msg.toolUse)) {
        const toolResults = msg.toolUse
          .filter(t => t.status === "success" || t.status === "error" || t.output !== undefined)
          .map(t => ({
            type: "tool-result",
            toolCallId: t.id,
            toolName: t.toolName,
            result: t.output || (t.status === "error" ? "Error occurred" : "Completed"),
            isError: t.status === "error",
          }));

        if (toolResults.length > 0) {
          coreMessages.push({
            role: "tool",
            content: toolResults,
          });
        }
      }
    }
  }

  return coreMessages;
}

class AgentSession {
  constructor() {
    this.activeStreams = new Map();
  }

  async startChat({ id, messages, workspacePath, providerId, modelId, apiKey, systemPrompt }, onChunk, onToolCall, onToolResult, onFinish, onError) {
    if (this.activeStreams.has(id)) this.abortChat(id);
    const abortController = new AbortController();
    this.activeStreams.set(id, abortController);

    try {
      const model = await providerManager.getModel(providerId, modelId, apiKey);
      const tools = getTools(workspacePath);
      const skillsPrompt = await getSkillsPrompt();
      const coreMessages = mapToCoreMessages(messages);

      console.log(`\n[BraneZO]: Turn Start - Session: ${id} | Model: ${modelId}`);
      // console.log("Core Messages:", JSON.stringify(coreMessages, null, 2));

      const result = streamText({
        model,
        messages: coreMessages,
        system: (systemPrompt || DEFAULT_SYSTEM_PROMPT) + skillsPrompt,
        tools,
        maxSteps: 15,
        toolChoice: "auto",
        abortSignal: abortController.signal,
      });

      for await (const chunk of result.fullStream) {
        if (abortController.signal.aborted) break;
        
        switch (chunk.type) {
          case "text-delta":
            if (chunk.textDelta) onChunk(chunk.textDelta);
            break;
          case "tool-call":
            console.log(`[Tool Call]: ${chunk.toolName}`);
            onToolCall({
              id: chunk.toolCallId,
              name: chunk.toolName,
              args: chunk.args
            });
            break;
          case "tool-result":
            console.log(`[Tool Result]: ${chunk.toolName}`);
            onToolResult({
              id: chunk.toolCallId,
              name: chunk.toolName,
              result: chunk.result
            });
            break;
          case "error":
            console.error("[SDK Stream Error]:", chunk.error);
            // Don't throw here to allow partial responses, but report it
            onError(chunk.error);
            break;
        }
      }

      if (abortController.signal.aborted) return;

      const final = await result.response;
      console.log(`[Turn Complete]: ${final.messages.length} messages generated`);

      // Send the full response messages back to sync the UI state
      onFinish(final.messages);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("[Fatal]:", e);
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
