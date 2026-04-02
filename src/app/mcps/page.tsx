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

const tabs = ["Connected", "Discover"];

export default function MCPPage() {
  const [activeTab, setActiveTab] = useState("Connected");
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [newId, setNewId] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [registryRepo, setRegistryRepo] = useState<string>("deepsuthar496/Brane");
  
  // Registry state
  const [registryIndex, setRegistryIndex] = useState<RegistryIndex | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryMcps, setCategoryMcps] = useState<McpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Credential Dialog state
  const [isCredDialogOpen, setIsCredDialogOpen] = useState(false);
  const [mcpToInstall, setMcpToInstall] = useState<McpEntry | null>(null);
  const [credValues, setCredValues] = useState<Record<string, string>>({});

  // Installed state
  const [installedMcps, setInstalledMcps] = useState<Record<string, InstalledItem>>({});

  const registryUrls = useMemo(() => getRegistryUrls(registryRepo), [registryRepo]);

  const loadRegistryConfig = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const repo = await window.electronAPI.getRegistryRepo();
      setRegistryRepo(repo);
    }
  }, []);

  const loadServers = useCallback(async () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      const realServers = await window.electronAPI.getMcpServers();
      setServers((realServers || []).map((s: MCPServer) => ({
        id: s.id,
        name: s.id,
        icon: s.url ? "🌐" : "⚙️",
        command: s.command,
        args: s.args,
        url: s.url,
        scope: "gemini",
        enabled: !s.disabled,
        category: s.url ? "GOOGLE" : "SYSTEM"
      } as MCPServer)));
      
      const installed = await window.electronAPI.getInstalledMcps();
      setInstalledMcps(installed || {});
    }
  }, []);

  const fetchRegistryIndex = useCallback(async () => {
    try {
      const data = await window.electronAPI.fetchRegistryData<RegistryIndex>(registryUrls.index);
      setRegistryIndex(data);
      if (data.categories.mcps.length > 0 && !activeCategory) {
        setActiveCategory(data.categories.mcps[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch registry index:", error);
    }
  }, [activeCategory, registryUrls]);

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

  const handleInstallRegistry = async (mcp: McpEntry) => {
    if (mcp.requiredCredentials && mcp.requiredCredentials.length > 0) {
      setMcpToInstall(mcp);
      setCredValues({});
      setIsCredDialogOpen(true);
      return;
    }

    if (window.electronAPI) {
      const result = await window.electronAPI.installMcp(mcp);
      if (result.success) {
        await loadServers();
      }
    }
  };

  const handleCredSubmit = async () => {
    if (!mcpToInstall || !window.electronAPI) return;

    // Clone and prepare MCP with credentials
    const preparedMcp = { ...mcpToInstall };
    
    // Replace placeholders in args
    if (preparedMcp.args) {
      preparedMcp.args = preparedMcp.args.map(arg => {
        let newArg = arg;
        Object.entries(credValues).forEach(([key, value]) => {
          newArg = newArg.replace(`{${key}}`, value);
        });
        return newArg;
      });
    }

    // Add credentials to env
    preparedMcp.env = preparedMcp.env || {};
    Object.entries(credValues).forEach(([key, value]) => {
      preparedMcp.env![key] = value;
    });

    const result = await window.electronAPI.installMcp(preparedMcp);
    if (result.success) {
      await loadServers();
      setIsCredDialogOpen(false);
      setMcpToInstall(null);
      setCredValues({});
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
              <Button onClick={() => setIsInstalling(true)} size="sm" className="h-8 gap-1.5 px-3 bg-primary hover:bg-primary/90 text-white rounded-md text-xs">
                <Plus className="size-3.5" />
                Add MCP
              </Button>
            }
          />

          {/* Tabs */}
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
              <aside className="w-56 border-r border-border flex flex-col shrink-0 bg-surface-1/10">
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

            <div className="flex-1 overflow-y-auto px-7 py-6 bg-surface-1/30">
              {activeTab === "Connected" ? (
                <>
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
                      const catServers = servers.filter(s => s.category === cat || (!s.category && cat === "SYSTEM"));
                      if (catServers.length === 0 && cat !== "SYSTEM") return null;

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
                                <div key={server.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-surface-2/40 transition-colors bg-background border border-border/50 mb-1 shadow-sm">
                                  <div className="size-9 rounded-lg bg-surface-3 border border-border/40 flex items-center justify-center text-lg shrink-0">
                                    {server.url ? <Globe className="size-4 text-agent-blue" /> : <Terminal className="size-4 text-agent-purple" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-[13px] font-semibold">{server.name}</h3>
                                      {installedMcps[server.id] && (
                                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-tight">Marketplace</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-txt-3 font-mono truncate opacity-70">{server.url || server.command}</p>
                                  </div>
                                  <div className="flex items-center gap-8">
                                    <span className="text-[10px] font-mono text-txt-3 text-right min-w-[100px] uppercase">{server.scope}</span>
                                    <Switch 
                                      checked={server.enabled} 
                                      onCheckedChange={(val) => handleToggle(server.id, val)}
                                    />
                                    <button onClick={() => handleRemove(server.id)} className="p-1.5 text-txt-3 hover:text-agent-red opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 h-full">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="size-8 animate-spin text-primary/50" />
                      <p className="text-xs text-txt-3 mt-4">Loading registry...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {categoryMcps.map((mcp) => (
                        <McpCard
                          key={mcp.id}
                          mcp={mcp}
                          isInstalled={!!installedMcps[mcp.id]}
                          onInstall={handleInstallRegistry}
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

      <Dialog open={isCredDialogOpen} onOpenChange={setIsCredDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credentials Required</DialogTitle>
            <DialogDescription>
              The {mcpToInstall?.name} MCP server requires additional information to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {mcpToInstall?.requiredCredentials?.map((cred) => (
              <div key={cred} className="space-y-2">
                <label className="text-xs font-medium text-txt-3 uppercase tracking-wider">
                  {cred.replace(/_/g, " ")}
                </label>
                <Input
                  type={cred.includes("TOKEN") || cred.includes("KEY") || cred.includes("SECRET") ? "password" : "text"}
                  placeholder={`Enter ${cred.replace(/_/g, " ").toLowerCase()}...`}
                  value={credValues[cred] || ""}
                  onChange={(e) => setCredValues(prev => ({ ...prev, [cred]: e.target.value }))}
                  className="bg-surface-2"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCredDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCredSubmit}>Confirm & Install</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
