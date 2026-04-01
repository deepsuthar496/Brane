"use client";

import { useState, useEffect } from "react";
import { Plus, MonitorPlay, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AgentDetailView } from "@/components/agents/agent-detail";
import { AgentIcon } from "@/components/agents/agent-icon";
import { Agent } from "@/lib/data";
import { cn } from "@/lib/utils";

const tabs = ["All Agents", "Running", "Code", "Chat"];

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState("All Agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchCLIs() {
      if (typeof window !== "undefined" && window.electronAPI) {
        try {
          setIsLoading(true);
          const discovered = await window.electronAPI.discoverCLIs();
          if (isMounted) {
            setAgents(discovered || []);
            if (discovered && discovered.length > 0) {
              setSelectedAgentId(discovered[0].id);
            }
          }
        } catch (err) {
          console.error("Failed to discover CLIs:", err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    }
    fetchCLIs();
    return () => { isMounted = false; };
  }, []);

  const runningCount = agents.filter((a) => a.status === "running").length;
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "Agents"]}
            title="AI Agents"
            subtitle="Manage your discovered CLI agents and their configurations"
            actions={
              <>
                <div className="inline-flex items-center gap-[5px] px-2.5 py-1 rounded-md text-[11.5px] font-medium bg-agent-green-dim text-agent-green border border-agent-green/20">
                  <MonitorPlay className="size-[11px]" />
                  {runningCount} running
                </div>
                <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1.5">
                  <Plus className="size-[13px]" />
                  Add Agent
                </Button>
              </>
            }
          />

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-7 pt-5 border-b border-border/60 shrink-0" role="tablist" aria-label="Agent categories">
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-2 text-[13px] font-medium cursor-pointer border-b-2 transition-colors relative bottom-[-1px]",
                  activeTab === tab
                    ? "text-primary border-primary"
                    : "text-txt-3 border-transparent hover:text-txt-1"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* SPLIT PANE CONTENT */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Pane: Explorer List */}
            <div className="w-[280px] border-r border-border/60 flex flex-col bg-surface-2/30">
              <div className="p-3 flex items-center justify-between border-b border-border/40">
                <span className="text-[11px] font-semibold text-txt-3 uppercase tracking-wider">
                  System Registry
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {isLoading ? (
                  <div className="p-4 text-center text-xs text-txt-3 animate-pulse">Scanning PATH...</div>
                ) : agents.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShieldAlert className="size-8 text-txt-3/20 mx-auto mb-3" />
                    <p className="text-[11px] text-txt-3 font-medium">No agents found in your system PATH.</p>
                  </div>
                ) : (
                  agents.map((agent) => {
                    const isSelected = selectedAgentId === agent.id;
                    const isRunning = agent.status === "running";
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isSelected
                            ? "bg-accent text-accent-foreground shadow-sm border border-border/50"
                            : "text-muted-foreground hover:bg-surface-3 border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "size-7 rounded-md bg-surface-3 border flex items-center justify-center text-sm shrink-0",
                          isSelected ? "border-border/60" : "border-border/30"
                        )}>
                          <AgentIcon icon={agent.icon} className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-[13px] font-medium truncate", isSelected ? "text-foreground" : "text-txt-2")}>
                            {agent.name}
                          </div>
                          <div className="text-[10px] font-mono text-txt-3 mt-0.5 truncate">
                            {agent.version}
                          </div>
                        </div>
                        <div className={cn(
                          "size-1.5 rounded-full shrink-0",
                          isRunning ? "bg-agent-green" : agent.status === "error" ? "bg-agent-red" : "bg-txt-3"
                        )} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Pane: Detail View */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a09]">
              <AgentDetailView agent={selectedAgent} />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
