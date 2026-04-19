import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key, Bot, Settings2, Plus, Trash2, ShieldCheck, PowerIcon, Search } from "lucide-react";

interface ProviderSettingsDialogProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  onModelsUpdate: () => void; // Trigger reload of models in prompt bar
}

export function ProviderSettingsDialog({ open, onOpenChange, onModelsUpdate }: ProviderSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "custom">("standard");
  const [keysInKeytar, setKeysInKeytar] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [registryProviders, setRegistryProviders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Connection sub-dialog state
  const [connectingProvider, setConnectingProvider] = useState<any>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Custom provider state
  const [customBaseUrl, setCustomBaseUrl] = useState("http://localhost:11434/v1");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModels, setCustomModels] = useState([{ id: "llama3", name: "Llama 3 (Local)" }]);

  useEffect(() => {
    if (open) {
      loadCredentials();
    }
  }, [open]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const globalRegistry = await window.electronAPI.getModelsRegistry();
      const providersArray = Object.keys(globalRegistry).map(key => globalRegistry[key]);
      // Sort so most popular are up top
      const popularPriority = ["openai", "anthropic", "google", "openrouter", "github-copilot", "ollama-cloud"];
      providersArray.sort((a, b) => {
         const iA = popularPriority.indexOf(a.id);
         const iB = popularPriority.indexOf(b.id);
         if (iA > -1 && iB > -1) return iA - iB;
         if (iA > -1) return -1;
         if (iB > -1) return 1;
         return a.name.localeCompare(b.name);
      });
      setRegistryProviders(providersArray);

      const credentials = await window.electronAPI.getAllCredentials();
      const keysObj: Record<string, boolean> = {};
      credentials.forEach((c: any) => {
        keysObj[c.envVar] = true;
        // Populate custom config if available
        if (c.envVar === "CUSTOM_API_BASE_URL") setCustomBaseUrl(c.value || "http://localhost:11434/v1");
        if (c.envVar === "CUSTOM_API_KEY") setCustomApiKey(c.value || "");
        if (c.envVar === "CUSTOM_MODELS_JSON") {
          try {
            setCustomModels(JSON.parse(c.value));
          } catch (e) {
            console.error("Failed to parse custom models", e);
          }
        }
      });
      setKeysInKeytar(keysObj);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveStandardKey = async () => {
    if (!connectingProvider || !connectingProvider.env || connectingProvider.env.length === 0) return;
    setIsSaving(true);
    try {
      const primaryEnv = connectingProvider.env[0];
      if (apiKeyInput.trim()) {
        await window.electronAPI.saveCredential(primaryEnv, apiKeyInput.trim());
      } else {
        await window.electronAPI.deleteCredential(primaryEnv);
      }
      setConnectingProvider(null);
      setApiKeyInput("");
      await loadCredentials();
      onModelsUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const saveCustomProvider = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI.saveCredential("CUSTOM_API_BASE_URL", customBaseUrl);
      if (customApiKey) {
         await window.electronAPI.saveCredential("CUSTOM_API_KEY", customApiKey);
      } else {
         await window.electronAPI.deleteCredential("CUSTOM_API_KEY");
      }
      await window.electronAPI.saveCredential("CUSTOM_MODELS_JSON", JSON.stringify(customModels));
      await loadCredentials();
      onModelsUpdate();
      onOpenChange(false); // Close dialog entirely on success
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-card border-border/50 shadow-2xl">
        <DialogHeader className="p-6 pb-2 border-b border-border/40">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            AI Provider Settings
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Configure Standard API keys or set up Local proxies. Keys are encrypted natively by your OS.
          </p>
        </DialogHeader>

        <div className="flex border-b border-border/40 px-6">
          <button
            onClick={() => setActiveTab("standard")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "standard"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Popular Providers
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "custom"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom / Local Provider
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : activeTab === "standard" ? (
            <div className="flex flex-col gap-3">
              <div className="relative mb-2">
                 <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Search providers (e.g. together, mistral, groq)..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="pl-9 bg-surface-2 border-border/50"
                 />
              </div>
              {registryProviders.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((provider) => {
                const primaryEnv = provider.env && provider.env[0] ? provider.env[0] : "";
                const isConnected = primaryEnv ? keysInKeytar[primaryEnv] : false;
                
                return (
                  <div
                    key={provider.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border/50 bg-surface-2/30 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                         {provider.id === "openai" && "🟢"}
                         {provider.id === "anthropic" && "🧠"}
                         {provider.id === "google" && "✨"}
                         {provider.name}
                      </span>
                      {provider.npm && (
                         <span className="text-[10px] text-muted-foreground">{provider.npm}</span>
                      )}
                    </div>

                    {connectingProvider?.id === provider.id ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in-0 duration-200">
                        <Input
                          type="password"
                          autoFocus
                          placeholder="sk-..."
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          className="h-8 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveStandardKey();
                            if (e.key === "Escape") setConnectingProvider(null);
                          }}
                        />
                        <Button size="sm" onClick={saveStandardKey} disabled={isSaving}>
                          {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConnectingProvider(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant={isConnected ? "outline" : "secondary"}
                        onClick={() => {
                          setConnectingProvider(provider);
                          setApiKeyInput("");
                        }}
                        className={isConnected ? "border-primary/50 text-foreground" : ""}
                      >
                        {isConnected ? (
                          <>
                            <ShieldCheck className="size-3.5 mr-1.5 text-primary" /> Update Key
                          </>
                        ) : (
                          <>
                            <PowerIcon className="size-3.5 mr-1.5" /> Connect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <Label className="text-xs text-muted-foreground">Base URL Endpoint (e.g. Ollama, LMStudio)</Label>
                <Input
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Label className="text-xs text-muted-foreground">API Key (Optional)</Label>
                <Input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="Leave empty for local inference"
                />
              </div>

              <div className="flex flex-col gap-3 mt-2 border-t border-border/40 pt-4">
                <Label className="text-xs text-muted-foreground flex justify-between items-center">
                  Map Available Models
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCustomModels([...customModels, { id: "", name: "" }])}
                  >
                    <Plus className="size-3 mr-1" /> Add Model
                  </Button>
                </Label>
                
                <div className="flex flex-col gap-2">
                  {customModels.map((cm, idx) => (
                    <div key={idx} className="flex gap-2 animate-in fade-in-0 duration-200">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Model ID (e.g. llama3)"
                        value={cm.id}
                        onChange={(e) => {
                          const newModels = [...customModels];
                          newModels[idx].id = e.target.value;
                          setCustomModels(newModels);
                        }}
                      />
                      <Input
                        className="h-8 text-xs"
                        placeholder="Display Name"
                        value={cm.name}
                        onChange={(e) => {
                          const newModels = [...customModels];
                          newModels[idx].name = e.target.value;
                          setCustomModels(newModels);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        onClick={() => {
                          if (customModels.length > 1) {
                            setCustomModels(customModels.filter((_, i) => i !== idx));
                          }
                        }}
                        disabled={customModels.length === 1}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={saveCustomProvider} disabled={isSaving} className="mt-2 text-primary-foreground bg-primary hover:bg-primary/90">
                {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : <ShieldCheck className="size-4 mr-2" />}
                Save Custom Settings
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
