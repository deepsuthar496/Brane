const { createOpenAI } = require("@ai-sdk/openai");
const { createOpenAICompatible } = require("@ai-sdk/openai-compatible");
const { createOpenRouter } = require("@openrouter/ai-sdk-provider");
const { createAnthropic } = require("@ai-sdk/anthropic");
const { createGoogleGenerativeAI } = require("@ai-sdk/google");
const credentialsManager = require("../credentials-manager");
const modelsRegistry = require("../models-registry");

function parseJwtClaims(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    return undefined;
  }
}

function extractAccountId(token) {
  const claims = parseJwtClaims(token);
  if (!claims) return undefined;
  return (
    claims.chatgpt_account_id ||
    claims["https://api.openai.com/auth"]?.chatgpt_account_id ||
    claims.organizations?.[0]?.id
  );
}

class ProviderManager {
  constructor() {
    this.providers = new Map();
  }

  async getProvider(providerId) {
    const registry = await modelsRegistry.getRegistry();
    const providerConfig = registry[providerId];

    const credentials = await credentialsManager.getAllCredentials();

    // Helper to resolve API key from keychain or env
    const resolveKey = (envVars = []) => {
      for (const envKey of envVars) {
        const hit = credentials.find(c => c.envVar === envKey)?.value || process.env[envKey];
        if (hit) return hit;
      }
      return null;
    };

    // --- Custom / Local provider (no registry entry) ---
    if (!providerConfig) {
      if (providerId === "custom") {
        const customBaseUrl = credentials.find(c => c.envVar === "CUSTOM_API_BASE_URL")?.value || "http://localhost:11434/v1";
        const customKey = credentials.find(c => c.envVar === "CUSTOM_API_KEY")?.value;
        // Use openai-compatible — the ONLY correct choice for arbitrary proxies
        return createOpenAICompatible({
          name: "custom",
          baseURL: customBaseUrl,
          apiKey: customKey && customKey !== "dummy_key" ? customKey : "local",
        });
      }
      throw new Error(`Provider "${providerId}" not found in models.dev registry.`);
    }

    const resolvedKey = resolveKey(providerConfig.env || []);
    const npm = providerConfig.npm || "@ai-sdk/openai-compatible";

    // --- Route to the CORRECT dedicated SDK, exactly like opencode ---
    switch (npm) {
      case "@ai-sdk/openai":
        // Native OpenAI — uses Responses API (/responses) which is ONLY for real OpenAI
        return createOpenAI({ apiKey: resolvedKey });

      case "@ai-sdk/anthropic":
        return createAnthropic({ apiKey: resolvedKey });

      case "@ai-sdk/google":
        return createGoogleGenerativeAI({ apiKey: resolvedKey });

      case "@openrouter/ai-sdk-provider":
        // OpenRouter has its own dedicated SDK — do NOT use @ai-sdk/openai for this
        return createOpenRouter({
          apiKey: resolvedKey,
          headers: {
            "HTTP-Referer": "https://agenthub.dev",
            "X-Title": "Brane Hub",
          },
        });

      case "@ai-sdk/openai-compatible":
      default:
        if (providerId === "codex" && resolvedKey) {
          let accessToken = resolvedKey;
          let accountId = null;
          
          if (accessToken.startsWith("oauth-")) {
            accessToken = accessToken.slice(6);
            if (accessToken.includes("::")) {
               const parts = accessToken.split("::");
               accessToken = parts[0];
               accountId = parts[1];
            }
          }
          
          if (!accountId) {
             accountId = extractAccountId(accessToken);
          }
          
          return createOpenAICompatible({
            name: "codex",
            baseURL: "https://chatgpt.com/backend-api/codex",
            apiKey: accessToken,
            fetch: async (url, options) => {
              const headers = new Headers(options.headers);
              headers.set("authorization", `Bearer ${accessToken}`);
              if (accountId) {
                headers.set("ChatGPT-Account-Id", accountId);
              }
              headers.set("originator", "opencode");
              headers.set("User-Agent", `opencode/1.2.3 (win32 10.0; x64)`);
              headers.set("session_id", Date.now().toString());
              
              // Rewriting URL from chat/completions to responses
              const targetUrl = url.toString().includes("/chat/completions") 
                ? "https://chatgpt.com/backend-api/codex/responses" 
                : url;
              
              // Map standard chat/completions body to ChatGPT Responses API format
              if (options.body && typeof options.body === "string" && targetUrl.includes("/responses")) {
                try {
                  const body = JSON.parse(options.body);
                  if (body.messages) {
                    const newInput = [];
                    
                    for (const msg of body.messages) {
                      const { role, content } = msg;
                      
                      if (role === "system") {
                        newInput.push({ role: "system", content: content });
                      } else if (role === "user") {
                        if (typeof content === "string") {
                          newInput.push({ role: "user", content: [{ type: "input_text", text: content }] });
                        } else if (Array.isArray(content)) {
                          newInput.push({ 
                            role: "user", 
                            content: content.map(part => {
                              if (part.type === "text") return { type: "input_text", text: part.text };
                              return part;
                            })
                          });
                        }
                      } else if (role === "assistant") {
                        // Handle text content
                        if (typeof content === "string" && content.trim() !== "") {
                           newInput.push({ role: "assistant", content: [{ type: "output_text", text: content }] });
                        } else if (Array.isArray(content)) {
                           // Vercel AI SDK content parts
                           for (const part of content) {
                             if (part.type === "text" && part.text.trim() !== "") {
                               newInput.push({ role: "assistant", content: [{ type: "output_text", text: part.text }] });
                             } else if (part.type === "tool-call") {
                               newInput.push({
                                 type: "function_call",
                                 call_id: part.toolCallId,
                                 name: part.toolName,
                                 arguments: JSON.stringify(part.args || part.input || {})
                               });
                             }
                           }
                        }
                        
                        // Legacy/Standard tool_calls property
                        if (msg.tool_calls) {
                          for (const tc of msg.tool_calls) {
                            newInput.push({
                              type: "function_call",
                              call_id: tc.id,
                              name: tc.function?.name || tc.name,
                              arguments: tc.function?.arguments || JSON.stringify(tc.args || {})
                            });
                          }
                        }
                      } else if (role === "tool") {
                        // Tool results
                        newInput.push({
                          type: "function_call_output",
                          call_id: msg.tool_call_id,
                          output: typeof content === "string" ? content : JSON.stringify(content)
                        });
                      }
                    }
                    
                    body.input = newInput;
                    delete body.messages;
                  }
                  
                  if (body.max_tokens !== undefined) {
                    body.max_output_tokens = body.max_tokens;
                    delete body.max_tokens;
                  }

                  // Map tools to Responses API format (flattened)
                  if (body.tools && Array.isArray(body.tools)) {
                    body.tools = body.tools.map(t => {
                      if (t.type === "function" && t.function) {
                        return {
                          type: "function",
                          name: t.function.name,
                          description: t.function.description,
                          parameters: t.function.parameters,
                          strict: t.function.strict
                        };
                      }
                      return t;
                    });
                  }
                  
                  // Responses API doesn't support 'stream: true' in the same way, 
                  // but openai-compatible SDK expects it. 
                  // We'll leave it as is unless it causes issues.

                  options.body = JSON.stringify(body);
                } catch (err) {
                  console.error("Failed to parse/rewrite body for Codex API", err);
                }
              }
              
              const resp = await fetch(targetUrl, {
                ...options,
                headers
              });

              if (!resp.ok) return resp;

              // Handle streaming response re-formatting
              const contentType = resp.headers.get("content-type");
              if (contentType && contentType.includes("text/event-stream")) {
                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                const encoder = new TextEncoder();
                let buffer = "";

                const stream = new ReadableStream({
                  async start() {
                    this.hasToolCall = false;
                  },
                  async pull(controller) {
                    const { done, value } = await reader.read();
                    if (done) {
                      controller.close();
                      return;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                      const trimmed = line.trim();
                      if (!trimmed || !trimmed.startsWith("data: ")) continue;
                      const dataStr = trimmed.slice(6).trim();
                      if (dataStr === "[DONE]") {
                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        continue;
                      }

                      try {
                        const original = JSON.parse(dataStr);
                        // console.log(`\n[Codex Raw Chunk]: ${JSON.stringify(original)}`);
                        
                        if (original.output) {
                          for (const item of original.output) {
                            const delta = { 
                              id: original.id || `chatcmpl-${Date.now()}`,
                              object: "chat.completion.chunk",
                              created: Math.floor(Date.now() / 1000),
                              model: original.model || "gpt-5.1-codex",
                              choices: [{ index: 0, delta: {}, finish_reason: null }] 
                            };
                            
                            if (item.type === "message" && item.content) {
                              let text = "";
                              for (const part of item.content) {
                                if (part.type === "text") text += part.text;
                              }
                              if (text) {
                                delta.choices[0].delta.content = text;
                              }
                            } else if (item.type === "function_call") {
                              this.hasToolCall = true;
                              delta.choices[0].delta.tool_calls = [{
                                index: 0,
                                id: item.call_id,
                                type: "function",
                                function: {
                                  name: item.name,
                                  arguments: typeof item.arguments === "string" ? item.arguments : JSON.stringify(item.arguments)
                                }
                              }];
                            }
                            
                            if (Object.keys(delta.choices[0].delta).length > 0) {
                              controller.enqueue(encoder.encode(`data: ${JSON.stringify(delta)}\n\n`));
                            }
                          }
                        }
                        
                        // Handle completion signal
                        if (original.status === "completed" || original.finish_reason === "stop") {
                           const finalDelta = {
                             id: original.id || `chatcmpl-${Date.now()}`,
                             object: "chat.completion.chunk",
                             created: Math.floor(Date.now() / 1000),
                             model: original.model || "gpt-5.1-codex",
                             choices: [{ 
                               index: 0, 
                               delta: {}, 
                               finish_reason: this.hasToolCall ? "tool_calls" : "stop" 
                             }]
                           };
                           controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalDelta)}\n\n`));
                           controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        }
                      } catch (e) {
                        // Skip malformed chunks
                      }
                    }
                  }
                });

                return new Response(stream, {
                  headers: resp.headers,
                  status: resp.status,
                  statusText: resp.statusText
                });
              }

              return resp;
            }
          });
        }

        // All other OpenAI-compatible proxies (Together, Groq, Ollama, LMStudio, etc.)
        // Use openai-compatible which hits /chat/completions NOT /responses
        return createOpenAICompatible({
          name: providerId,
          baseURL: providerConfig.api || "http://localhost:11434/v1",
          apiKey: resolvedKey || (providerId === "codex" ? "dummy_key" : "local"),
        });
    }
  }

  async getModel(providerId, modelId) {
    const provider = await this.getProvider(providerId);
    // All providers expose .languageModel() or are callable directly
    if (typeof provider.languageModel === "function") {
      return provider.languageModel(modelId);
    }
    // Fallback: provider itself is callable (openai, anthropic, google pattern)
    return provider(modelId);
  }
}

module.exports = new ProviderManager();
