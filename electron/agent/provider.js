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
                    body.input = body.messages.map(msg => {
                      if (typeof msg.content === "string") {
                        if (msg.role === "system") return { role: "system", content: msg.content };
                        if (msg.role === "assistant") return { role: "assistant", content: [{ type: "output_text", text: msg.content }] };
                        return { role: msg.role, content: [{ type: "input_text", text: msg.content }] };
                      }
                      
                      // Map array contents
                      if (Array.isArray(msg.content)) {
                         const newContent = msg.content.map(part => {
                            if (part.type === "text") return { type: msg.role === "assistant" ? "output_text" : "input_text", text: part.text };
                            // Very basic tool-use mapping
                            if (part.type === "tool_calls") return part; 
                            return part;
                         });
                         return { role: msg.role, content: newContent };
                      }
                      return msg;
                    });
                    delete body.messages;
                  }
                  if (body.max_tokens !== undefined) {
                    body.max_output_tokens = body.max_tokens;
                    delete body.max_tokens;
                  }
                  options.body = JSON.stringify(body);
                } catch (err) {
                  console.error("Failed to parse/rewrite body for Codex API", err);
                }
              }
              
              return fetch(targetUrl, {
                ...options,
                headers
              });
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
