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
  const [loginMethod, setLoginMethod] = useState<"oauth" | "api" | null>(null);
  const [oauthData, setOauthData] = useState<{ url: string; code?: string } | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
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

  const handleStartOAuth = async () => {
    setOauthError(null);
    try {
      const res = await window.electronAPI.startOAuth();
      setOauthData(res);
      // Open the URL in the system browser
      await window.electronAPI.openExternal(res.url);
      
      const authResult = await window.electronAPI.waitForOAuth({ state: res.state, pkce: res.pkce });
      
      if (authResult && authResult.accessToken) {
        setApiKeyInput("oauth-...");
        const tokenString = authResult.accountId ? `${authResult.accessToken}::${authResult.accountId}` : authResult.accessToken;
        await handleSaveOAuthResult(tokenString);
      }
    } catch (e: any) {
      console.error("OAuth failed or cancelled", e);
      setOauthError(e.message || "Authorization failed");
    }
  };

  const handleSaveOAuthResult = async (tokenData: string) => {
    if (!connectingProvider || !connectingProvider.env || connectingProvider.env.length === 0) return;
    setIsSaving(true);
    try {
      const primaryEnv = connectingProvider.env[0];
      await window.electronAPI.saveCredential(primaryEnv, `oauth-${tokenData}`);
      setConnectingProvider(null);
      setLoginMethod(null);
      setOauthData(null);
      setApiKeyInput("");
      await loadCredentials();
      onModelsUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
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
      setLoginMethod(null);
      setOauthData(null);
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
                         {provider.id === "cerebras" && "⚡"}
                         {provider.id === "groq" && "⚡"}
                         {provider.name}
                      </span>
                      {provider.npm && (
                         <span className="text-[10px] text-muted-foreground">{provider.npm}</span>
                      )}
                    </div>

                    {connectingProvider?.id === provider.id ? (
                      <div className="flex flex-col gap-3 w-full animate-in fade-in-0 duration-200 bg-surface-2/50 p-4 rounded-xl border border-border/50">
                        {(!loginMethod && (provider.id === "openai" || provider.id === "codex")) ? (
                          <div className="flex flex-col gap-2.5">
                             <span className="text-[13px] font-medium text-txt-2">Select login method for {provider.name}.</span>
                             <div className="grid grid-cols-1 gap-2">
                                <button 
                                  onClick={() => {
                                    setLoginMethod("oauth");
                                    handleStartOAuth();
                                  }}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-left transition-all border border-border/40 group"
                                >
                                   <div className="size-4 rounded border border-border group-hover:border-primary flex items-center justify-center transition-colors">
                                      <div className="size-2 rounded-sm bg-primary scale-0 group-hover:scale-100 transition-transform" />
                                   </div>
                                   <span className="text-sm font-medium">ChatGPT Pro/Plus (browser)</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setLoginMethod("oauth");
                                    handleStartOAuth();
                                  }}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-left transition-all border border-border/40 group"
                                >
                                   <div className="size-4 rounded border border-border group-hover:border-primary flex items-center justify-center transition-colors">
                                      <div className="size-2 rounded-sm bg-primary scale-0 group-hover:scale-100 transition-transform" />
                                   </div>
                                   <span className="text-sm font-medium">ChatGPT Pro/Plus (headless)</span>
                                </button>
                                <button 
                                  onClick={() => setLoginMethod("api")}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-left transition-all border border-border/40 group"
                                >
                                   <div className="size-4 rounded border border-border group-hover:border-primary flex items-center justify-center transition-colors">
                                      <div className="size-2 rounded-sm bg-primary scale-0 group-hover:scale-100 transition-transform" />
                                   </div>
                                   <span className="text-sm font-medium">API key</span>
                                </button>
                             </div>
                             <div className="flex justify-end pt-1">
                                <Button size="sm" variant="ghost" onClick={() => {
                                   setConnectingProvider(null);
                                   setLoginMethod(null);
                                }}>
                                  Cancel
                                </Button>
                             </div>
                          </div>
                        ) : loginMethod === "oauth" ? (
                          <div className="flex flex-col gap-4 animate-in fade-in-0 duration-300">
                             <div className="flex items-start justify-between">
                                <div className="flex flex-col gap-1">
                                   <span className="text-[13px] font-medium text-foreground">Connect {provider.name}</span>
                                   <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      Visit <a href={oauthData?.url} target="_blank" className="text-primary hover:underline font-medium">this link</a> and enter the code below to connect your account and use {provider.name} models in BraneZO.
                                   </p>
                                </div>
                             </div>

                             <div className="flex flex-col gap-2">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Confirmation code</Label>
                                <div className="relative group">
                                   <Input 
                                      readOnly 
                                      value={apiKeyInput || "Complete authorization in your browser. This window will close au"} 
                                      className="bg-background border-border/40 text-[13px] font-mono pr-10"
                                   />
                                   <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-7 text-muted-foreground hover:text-foreground">
                                      <Bot className="size-3.5" />
                                   </Button>
                                </div>
                             </div>

                             <div className="flex items-center gap-2 pt-2 text-[12px]">
                                {oauthError ? (
                                  <span className="text-red-500 font-medium">{oauthError}</span>
                                ) : (
                                  <>
                                    <Loader2 className="size-3.5 animate-spin text-primary" />
                                    <span className="text-muted-foreground">Waiting for authorization...</span>
                                  </>
                                )}
                             </div>

                             <div className="flex justify-end pt-2">
                                <Button size="sm" variant="ghost" onClick={() => {
                                   setLoginMethod(null);
                                   setOauthData(null);
                                   setOauthError(null);
                                   window.electronAPI.stopOAuth();
                                }}>
                                   Back
                                </Button>
                             </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 w-full">
                            <Input
                              type="password"
                              autoFocus
                              placeholder="sk-..."
                              value={apiKeyInput}
                              onChange={(e) => setApiKeyInput(e.target.value)}
                              className="h-8 flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveStandardKey();
                                if (e.key === "Escape") {
                                  if (loginMethod && (provider.id === "openai" || provider.id === "codex")) {
                                    setLoginMethod(null);
                                  } else {
                                    setConnectingProvider(null);
                                    setLoginMethod(null);
                                  }
                                }
                              }}
                            />
                            <Button size="sm" onClick={saveStandardKey} disabled={isSaving}>
                              {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                               if (loginMethod && (provider.id === "openai" || provider.id === "codex")) {
                                 setLoginMethod(null);
                               } else {
                                 setConnectingProvider(null);
                                 setLoginMethod(null);
                               }
                            }}>
                              {loginMethod ? "Back" : "Cancel"}
                            </Button>
                          </div>
                        )}
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
