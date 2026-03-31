"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Globe, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Switch } from "@/components/ui/switch";
import { MCPServer } from "@/lib/data";
import { cn } from "@/lib/utils";

const tabs = ["All", "Enabled", "Disabled", "Global"];

export default function MCPPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [newId, setNewId] = useState("");
  const [newCommand, setNewCommand] = useState("");

  const loadServers = async () => {
    if (typeof window !== "undefined" && window.electronAPI) {
      const realServers = await window.electronAPI.getMcpServers();
      setServers((realServers || []).map((s: any) => ({
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
    }
  };

  useEffect(() => { loadServers(); }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    if (typeof window !== "undefined" && window.electronAPI) {
      await window.electronAPI.toggleMcpServer(id, enabled);
      await loadServers();
    }
  };

  const handleRemove = async (id: string) => {
    if (typeof window !== "undefined" && window.electronAPI) {
      await window.electronAPI.removeMcpServer(id);
      await loadServers();
    }
  };

  const handleInstall = async () => {
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
          <div className="flex items-center gap-6 px-7 pt-2 border-b border-border/60 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "pb-3 text-[13px] font-medium transition-colors relative",
                  activeTab === tab ? "text-primary border-b-2 border-primary" : "text-txt-3 hover:text-txt-1"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-7 py-6">
            {isInstalling && (
               <div className="mb-8 p-6 bg-surface-2 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Input placeholder="Server Alias (e.g. github)" value={newId} onChange={e => setNewId(e.target.value)} className="bg-background" />
                    <Input placeholder="Command or URL" value={newCommand} onChange={e => setNewCommand(e.target.value)} className="bg-background" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsInstalling(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleInstall}>Save Connection</Button>
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
                          <div key={server.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-surface-2/40 transition-colors">
                            <div className="size-9 rounded-lg bg-surface-3 border border-border/40 flex items-center justify-center text-lg shrink-0">
                               {server.url ? <Globe className="size-4 text-agent-blue" /> : <Terminal className="size-4 text-agent-purple" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[13px] font-semibold">{server.name}</h3>
                              <p className="text-[11px] text-txt-3 font-mono truncate opacity-70">{server.url || server.command}</p>
                            </div>
                            <div className="flex items-center gap-8">
                              <span className="text-[10px] font-mono text-txt-3 text-right min-w-[100px]">{server.scope}</span>
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
          </div>
        </main>
      </div>
    </div>
  );
}
