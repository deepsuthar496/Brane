const { createOpenAI } = require("@ai-sdk/openai");
const { createOpenAICompatible } = require("@ai-sdk/openai-compatible");
const { createOpenRouter } = require("@openrouter/ai-sdk-provider");
const { createAnthropic } = require("@ai-sdk/anthropic");
const { createGoogleGenerativeAI } = require("@ai-sdk/google");
const credentialsManager = require("../credentials-manager");
const modelsRegistry = require("../models-registry");

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
        // All other OpenAI-compatible proxies (Together, Groq, Ollama, LMStudio, etc.)
        // Use openai-compatible which hits /chat/completions NOT /responses
        return createOpenAICompatible({
          name: providerId,
          baseURL: providerConfig.api || "http://localhost:11434/v1",
          apiKey: resolvedKey || "local",
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
