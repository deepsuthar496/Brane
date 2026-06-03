"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Globe, Terminal, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Switch } from "@/components/ui/switch";
import { MCPServer } from "@/lib/data";
import {
  getRegistryUrls,
  RegistryIndex,
  McpEntry,
  InstalledItem
} from "@/lib/registry";
import { McpCard } from "@/components/mcps/mcp-card";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const tabs = ["Connected", "Discover"];

export default function MCPPage() {
  const [activeTab, setActiveTab] = useState("Discover");
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [newId, setNewId] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [registryRepo, setRegistryRepo] = useState<string>("deepsuthar496/BraneRegistry");

  // Registry state
  const [registryIndex, setRegistryIndex] = useState<RegistryIndex | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryMcps, setCategoryMcps] = useState<McpEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Install Dialog state
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [mcpToInstall, setMcpToInstall] = useState<McpEntry | null>(null);
  const [installTargets, setInstallTargets] = useState<string[]>(["gemini", "claude"]);
  const [isInstallLoading, setIsInstallLoading] = useState(false);

  // Installed state
  const [installedMcps, setInstalledMcps] = useState<Record<string, InstalledItem>>({});

  const registryUrls = useMemo(() => getRegistryUrls(registryRepo), [registryRepo]);

  const loadRegistryConfig = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const repo = "deepsuthar496/BraneRegistry";
      setRegistryRepo(repo);
    }
  }, []);

  const loadServers = useCallback(async () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      const realServers = await window.electronAPI.getMcpServers();
      setServers((realServers || []).map((s: MCPServer & { isBuiltIn?: boolean, disabled?: boolean }) => ({
        id: s.id,
        name: s.name || s.id,
        icon: s.url ? "lucide:globe" : "lucide:terminal",
        command: s.command,
        args: s.args,
        url: s.url,
        scope: "gemini",
        enabled: s.enabled !== undefined ? s.enabled : !s.disabled,
        category: s.isBuiltIn ? "SYSTEM" : (s.url ? "GOOGLE" : "SYSTEM"),
        isBuiltIn: s.isBuiltIn
      } as any)));

      const installed = await window.electronAPI.getInstalledMcps();
      setInstalledMcps(installed || {});
    }
  }, []);

  const fetchRegistryIndex = useCallback(async () => {
    try {
      const data = await window.electronAPI.fetchRegistryData<RegistryIndex>(registryUrls.index);
      setRegistryIndex(data);
      setActiveCategory(prev => prev || (data.categories.mcps.length > 0 ? data.categories.mcps[0].id : null));
    } catch (error) {
      console.error("Failed to fetch registry index:", error);
    }
  }, [registryUrls]);

  const fetchCategoryMcps = useCallback(async (categoryId: string) => {
    setLoading(true);
    try {
      const data = await window.electronAPI.fetchRegistryData<{ mcps: McpEntry[] }>(
        registryUrls.mcpCategory(categoryId)
      );
      setCategoryMcps(data.mcps || []);
    } catch (error) {
      console.error(`Failed to fetch MCPs for category ${categoryId}:`, error);
    } finally {
      setLoading(false);
    }
  }, [registryUrls]);

  useEffect(() => {
    loadRegistryConfig();
    loadServers();
  }, [loadRegistryConfig, loadServers]);

  useEffect(() => {
    if (registryUrls && window.electronAPI) {
      fetchRegistryIndex();
    }
  }, [registryUrls, fetchRegistryIndex]);

  useEffect(() => {
    if (activeCategory && activeTab === "Discover") {
      fetchCategoryMcps(activeCategory);
    }
  }, [activeCategory, activeTab, fetchCategoryMcps]);

  const handleToggle = async (id: string, enabled: boolean) => {
    if (typeof window !== "undefined" && window.electronAPI) {
      await window.electronAPI.toggleMcpServer(id, enabled);
      await loadServers();
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm(`Are you sure you want to disconnect the "${id}" MCP server?`)) return;

    if (typeof window !== "undefined" && window.electronAPI) {
      if (installedMcps[id]) {
        await window.electronAPI.uninstallMcp(id);
      } else {
        await window.electronAPI.removeMcpServer(id);
      }
      await loadServers();
    }
  };

  const handleInstallManual = async () => {
    if (!newId || !newCommand) return;
    if (typeof window !== "undefined" && window.electronAPI) {
      const isUrl = newCommand.startsWith("http");
      const config = isUrl ? { url: newCommand } : { command: newCommand.split(" ")[0], args: newCommand.split(" ").slice(1) };
      await window.electronAPI.addMcpServer(newId, config);
      await loadServers();
      setIsInstalling(false);
      setNewId("");
      setNewCommand("");
    }
  };

  const handleInstallClick = (mcp: McpEntry) => {
    setMcpToInstall(mcp);
    setIsInstallDialogOpen(true);
  };

  const handleInstallRegistry = async (mcp: McpEntry, targets: string[]) => {
    setIsInstallLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.installMcp(mcp, targets);
        if (result === true || (typeof result === "object" && result !== null && (result as any).success)) {
          await loadServers();
          setIsInstallDialogOpen(false);
        }
      }
    } finally {
      setIsInstallLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "MCP Servers"]}
            title="MCP Servers"
            subtitle="Model Context Protocol servers shared across agents"
            actions={
              <Button 
                onClick={() => setIsInstalling(true)} 
                size="sm" 
                className="h-7 px-2.5 text-xs gap-1.5"
              >
                <Plus className="size-[13px]" />
                New MCP
              </Button>
            }
          />

          <div className="flex items-center gap-0.5 px-7 pt-2 border-b border-border shrink-0" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-2 text-[13px] font-[450] cursor-pointer border-b-2 transition-colors relative bottom-[-1px]",
                  activeTab === tab
                    ? "text-primary border-primary font-medium"
                    : "text-txt-3 border-transparent hover:text-muted-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === "Discover" && (
              <aside className="w-56 border-r border-border flex flex-col shrink-0">
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-txt-4" />
                    <Input
                      placeholder="Search registry..."
                      className="pl-8 h-8 text-xs bg-surface-1 border-border"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="text-[10px] font-bold text-txt-4 uppercase tracking-wider px-3 mb-2">
                    Categories
                  </div>
                  <nav className="space-y-0.5">
                    {registryIndex?.categories.mcps.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors",
                          activeCategory === cat.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-txt-3 hover:bg-surface-2 hover:text-foreground"
                        )}
                      >
                        <span className="flex-1 text-left">{cat.label}</span>
                        <span className="text-[10px] text-txt-4">{cat.count}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            <div className="flex-1 overflow-y-auto bg-background">
              {activeTab === "Connected" ? (
                <div className="px-7 py-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-txt-4" />
                      <Input
                        placeholder="Search connected servers..."
                        className="pl-8 h-8 text-xs bg-background border-border"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {isInstalling && (
                    <div className="mb-8 p-6 bg-surface-2 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <Input placeholder="Server Alias (e.g. github)" value={newId} onChange={e => setNewId(e.target.value)} className="bg-background" />
                        <Input placeholder="Command or URL" value={newCommand} onChange={e => setNewCommand(e.target.value)} className="bg-background" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsInstalling(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleInstallManual}>Save Connection</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-12">
                    {["SYSTEM", "GOOGLE", "COMMUNITY"].map((cat) => {
                      const catServers = servers.filter(s => 
                        (s.category === cat || (!s.category && cat === "SYSTEM")) &&
                        (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (s.command && s.command.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (s.url && s.url.toLowerCase().includes(searchQuery.toLowerCase())))
                      );
                      if (catServers.length === 0 && (cat !== "SYSTEM" || searchQuery !== "")) return null;

                      return (
                        <div key={cat} className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-[1px] flex-1 bg-border/20" />
                            <span className="text-[10px] font-bold text-txt-3 tracking-[0.2em]">{cat}</span>
                            <div className="h-[1px] flex-1 bg-border/20" />
                          </div>

                          <div className="space-y-1">
                            {catServers.length === 0 && cat === "SYSTEM" && servers.length === 0 ? (
                              <p className="text-center py-10 text-[13px] text-txt-3 italic border border-dashed border-border/20 rounded-2xl">
                                No servers connected to Gemini CLI yet.
                              </p>
                            ) : (
                              catServers.map((server) => (
                                <div key={server.id} className="group flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-surface-2 transition-all bg-card border border-border/40 mb-2 shadow-none ring-1 ring-black/[0.02]">
                                  <div className="size-9 rounded-lg bg-surface-2 border border-border/40 flex items-center justify-center shrink-0 shadow-sm text-foreground">
                                    {server.url ? <Globe className="size-4.5 text-agent-blue" /> : <Terminal className="size-4.5 text-agent-purple" />}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 flex items-center justify-between gap-6">
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-[13.5px] font-bold text-foreground truncate">{server.name}</h3>
                                        {installedMcps[server.id] && (
                                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black uppercase tracking-tighter ring-1 ring-primary/20">Marketplace</span>
                                        )}
                                      </div>
                                      <p className="text-[10.5px] text-txt-4 font-mono truncate opacity-60 mt-0.5">{server.url || server.command}</p>
                                    </div>

                                    <div className="flex items-center gap-8 shrink-0">
                                      <div className="text-right min-w-[80px]">
                                        <span className="text-[10px] font-black font-mono text-txt-4 uppercase tracking-widest bg-surface-3 px-2 py-0.5 rounded border border-border/30">
                                          {server.scope}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <Switch
                                          checked={server.enabled}
                                          onCheckedChange={(val) => handleToggle(server.id, val)}
                                          className="scale-90"
                                        />
                                        
                                        {!(server as any).isBuiltIn ? (
                                          <button 
                                            onClick={() => handleRemove(server.id)} 
                                            className="p-1.5 text-txt-4 hover:text-agent-red hover:bg-agent-red/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                          >
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        ) : (
                                          <div className="size-7 px-1.5" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="px-7 py-6">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="size-8 animate-spin text-primary/50" />
                      <p className="text-xs text-txt-3 mt-4">Loading registry...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 border-t border-l border-white/5 bg-white/[0.02]">
                      {categoryMcps.map((mcp) => (
                        <McpCard
                          key={mcp.id}
                          mcp={mcp}
                          isInstalled={!!installedMcps[mcp.id]}
                          onInstall={async () => handleInstallClick(mcp)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Install MCP Server</DialogTitle>
            <DialogDescription>
              Choose which agents you want to enable {mcpToInstall?.name} for.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                setInstallTargets(prev => prev.includes('gemini') ? prev.filter(t => t !== 'gemini') : [...prev, 'gemini']);
            }}>
              <Checkbox 
                id="target-gemini" 
                checked={installTargets.includes('gemini')}
                onCheckedChange={(checked) => {
                    setInstallTargets(prev => checked ? [...prev, 'gemini'] : prev.filter(t => t !== 'gemini'));
                }}
              />
              <div className="flex flex-col gap-0.5 cursor-pointer">
                <Label htmlFor="target-gemini" className="font-bold text-[13px] cursor-pointer">Gemini CLI</Label>
                <p className="text-[11px] text-muted-foreground">Internal agentic terminal engine.</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                setInstallTargets(prev => prev.includes('claude') ? prev.filter(t => t !== 'claude') : [...prev, 'claude']);
            }}>
              <Checkbox 
                id="target-claude" 
                checked={installTargets.includes('claude')}
                onCheckedChange={(checked) => {
                    setInstallTargets(prev => checked ? [...prev, 'claude'] : prev.filter(t => t !== 'claude'));
                }}
              />
              <div className="flex flex-col gap-0.5 cursor-pointer">
                <Label htmlFor="target-claude" className="font-bold text-[13px] cursor-pointer">Claude Code</Label>
                <p className="text-[11px] text-muted-foreground">External terminal agent by Anthropic.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsInstallDialogOpen(false)}>Cancel</Button>
            <Button 
                disabled={installTargets.length === 0 || isInstallLoading} 
                onClick={() => mcpToInstall && handleInstallRegistry(mcpToInstall, installTargets)}
            >
              {isInstallLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
              Install to {installTargets.length === 1 ? (installTargets[0] === 'gemini' ? 'Gemini' : 'Claude') : 'Selected'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
