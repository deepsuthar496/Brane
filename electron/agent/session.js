const { streamText } = require("ai");
const providerManager = require("./provider");
const { getTools } = require("./tools");

const DEFAULT_SYSTEM_PROMPT = `You are BraneZO, a highly capable AI coding assistant integrated directly into the Brane Hub desktop IDE.
You have access to the user's workspace filesystem and terminal.
Use tools proactively to investigate the codebase, write code, run tests, and fix errors.
Always run bash commands in powershell/bash depending on OS.
Keep your responses concise and action-oriented. Let the tool output and diffs speak for themselves where possible.`;

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

      const result = streamText({
        model,
        messages,
        system: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        tools,
        abortSignal: abortController.signal,
        maxSteps: 15, // Allow multiple tool turns automatically
        onStepFinish: (event) => {
           if (event.toolCalls && event.toolCalls.length > 0) {
             for (const call of event.toolCalls) {
               console.log(`\n[BraneZO Tool Called]: ${call.toolName}`);
               onToolCall({
                 id: call.toolCallId,
                 name: call.toolName,
                 args: call.args
               });
             }
           }
           if (event.toolResults && event.toolResults.length > 0) {
             for (const res of event.toolResults) {
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
        
        if (chunk.type === "text-delta") {
          process.stdout.write(chunk.textDelta || ""); // Terminal fallback logging
          onChunk(chunk.textDelta || "");
        } else if (chunk.type === "error") {
          console.error("\n[BraneZO ERROR]:", chunk.error);
          onError(chunk.error);
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
