const https = require('https');

class ModelsRegistry {
  constructor() {
    this.registryCache = null;
    this.lastFetch = 0;
    this.CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
  }

  async fetchRegistry() {
    // Return cached registry if fresh
    if (this.registryCache && (Date.now() - this.lastFetch < this.CACHE_TTL)) {
      return this.registryCache;
    }

    return new Promise((resolve, reject) => {
      https.get('https://models.dev/api.json', {
        headers: { 'User-Agent': 'BraneZO-Electron/1.0' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            this.registryCache = parsed;
            this.lastFetch = Date.now();
            resolve(parsed);
          } catch (e) {
            reject(new Error("Failed to parse models.dev registry"));
          }
        });
      }).on('error', (err) => {
        if (this.registryCache) {
          console.warn("Failed to reach models.dev, falling back to expired cache.");
          resolve(this.registryCache);
        } else {
          // Hardcoded fallback for core providers if offline completely on first boot
          resolve({
            "openai": { id: "openai", name: "OpenAI", env: ["OPENAI_API_KEY"], api: "https://api.openai.com/v1", npm: "@ai-sdk/openai", models: {} },
            "anthropic": { id: "anthropic", name: "Anthropic", env: ["ANTHROPIC_API_KEY"], npm: "@ai-sdk/anthropic", models: {} },
            "google": { id: "google", name: "Google", env: ["GOOGLE_API_KEY"], npm: "@ai-sdk/google", models: {} },
            "cerebras": { id: "cerebras", name: "Cerebras", env: ["CEREBRAS_API_KEY"], npm: "@ai-sdk/cerebras", models: {} },
            "groq": { id: "groq", name: "Groq", env: ["GROQ_API_KEY"], npm: "@ai-sdk/groq", models: {} },
            "openrouter": { id: "openrouter", name: "OpenRouter", env: ["OPENROUTER_API_KEY"], npm: "@ai-sdk/openai-compatible", api: "https://openrouter.ai/api/v1", models: {} },
            "codex": { 
              id: "codex", 
              name: "Codex", 
              env: ["CODEX_API_KEY"], 
              npm: "@ai-sdk/openai-compatible", 
              api: "https://chatgpt.com/backend-api/codex", 
              models: {
                "gpt-5.1-codex": { id: "gpt-5.1-codex", name: "GPT 5.1 Codex" },
                "gpt-5.1-codex-max": { id: "gpt-5.1-codex-max", name: "GPT 5.1 Codex Max" },
                "gpt-5.2-codex": { id: "gpt-5.2-codex", name: "GPT 5.2 Codex" },
                "gpt-5.3-codex": { id: "gpt-5.3-codex", name: "GPT 5.3 Codex" },
                "gpt-5.4": { id: "gpt-5.4", name: "GPT 5.4" }
              } 
            }
          });
        }
      });
    });
  }

  async getRegistry() {
    return await this.fetchRegistry();
  }
}

const registryInstance = new ModelsRegistry();
module.exports = registryInstance;
