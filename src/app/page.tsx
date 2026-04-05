"use client";

import { useState, useEffect } from "react";
import { Plus, MonitorPlay, MessageSquare, Terminal, Settings2, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AgentIcon } from "@/components/agents/agent-icon";
import { Agent } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AgentDetailView } from "@/components/agents/agent-detail";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Session {
  id: string;
  agentId: string;
  task: string;
  status: "success" | "failed";
  time: string;
  duration: string;
  tokens: string;
  turns: number;
  impact: string;
}

const MOCK_SESSIONS: Session[] = [
  { 
    id: "run-a8b2x", agentId: "gemini-cli", task: "Implement global command palette matching shadcn UI", 
    status: "success", time: "12 mins ago", duration: "4m 12s", tokens: "84.2k", turns: 12, impact: "High"
  },
  { 
    id: "run-c9f4k", agentId: "gemini-cli", task: "Fix typescript error regarding item.href in app-sidebar", 
    status: "success", time: "2 hours ago", duration: "1m 45s", tokens: "12.8k", turns: 3, impact: "Low"
  },
  { 
    id: "run-z1d9m", agentId: "gemini-cli", task: "Setup agent authentication with Supabase", 
    status: "failed", time: "Yesterday", duration: "8m 30s", tokens: "142.5k", turns: 28, impact: "Critical"
  },
  { 
    id: "run-q5w2p", agentId: "gemini-cli", task: "Analyze memory leak in worker thread", 
    status: "success", time: "2 days ago", duration: "12m 05s", tokens: "210.1k", turns: 45, impact: "High"
  }
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;
  const agentSessions = MOCK_SESSIONS.filter(s => s.agentId === selectedAgentId);
  const activeSession = agentSessions.find(s => s.id === selectedSessionId) || null;

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex overflow-hidden bg-background">
          
          {/* Inner Sidebar (Sessions & Agent Selection) */}
          <div className="w-[260px] bg-surface-2/30 border-r border-border/60 flex flex-col shrink-0">
            {/* Agent Selector Header */}
            <div className="p-3 border-b border-border/40">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-2 h-10 hover:bg-surface-3"
                    />
                  }
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {selectedAgent ? (
                      <>
                        <div className="size-6 rounded bg-surface-3 border border-border/50 flex items-center justify-center shrink-0">
                          <AgentIcon icon={selectedAgent.icon} className="size-3.5" />
                        </div>
                        <span className="text-[13px] font-semibold truncate">
                          {selectedAgent.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] font-medium text-txt-3">
                        Select Agent
                      </span>
                    )}
                  </div>
                  <MoreHorizontal className="size-4 text-txt-4 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[236px]" align="start">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-txt-4 font-bold">My Agents</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {agents.map(agent => (
                    <DropdownMenuItem 
                      key={agent.id} 
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setSelectedSessionId(null);
                      }}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer py-2",
                        selectedAgentId === agent.id && "bg-accent/50"
                      )}
                    >
                      <div className="size-5 rounded bg-surface-3 border border-border/30 flex items-center justify-center shrink-0">
                        <AgentIcon icon={agent.icon} className="size-3" />
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-[12px] font-medium truncate">{agent.name}</span>
                        <span className="text-[10px] text-txt-4 font-mono truncate">{agent.version}</span>
                      </div>
                      {agent.status === "running" && (
                         <div className="size-1.5 rounded-full bg-agent-green shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-[12px] cursor-pointer">
                    <Plus className="mr-2 size-3.5" /> Add New Agent
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Actions */}
            <div className="p-3">
              <Button 
                onClick={() => setSelectedSessionId(null)}
                className={cn(
                  "w-full justify-start gap-2 h-9 text-[12px] shadow-sm",
                  selectedSessionId === null 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-surface-3 hover:bg-surface-3/80 text-foreground border border-border/50"
                )}
              >
                {selectedSessionId === null ? <Settings2 className="size-4" /> : <Plus className="size-4" />}
                {selectedSessionId === null ? "Agent Overview" : "New Session"}
              </Button>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-txt-3 animate-pulse">Loading sessions...</div>
              ) : agentSessions.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="size-6 text-txt-3/30 mx-auto mb-2" />
                  <p className="text-[11px] text-txt-3 font-medium">No sessions found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grouped by Today/Previous - keeping simple for now */}
                  <div className="space-y-1">
                    <div className="px-2 pb-1.5 text-[10px] font-bold text-txt-4 uppercase tracking-wider">
                      Recent Activity
                    </div>
                    {agentSessions.map((session) => {
                      const isSelected = selectedSessionId === session.id;
                      return (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={cn(
                            "w-full flex flex-col gap-1 px-3 py-2.5 rounded-lg text-left transition-all",
                            isSelected
                              ? "bg-accent/80 text-accent-foreground shadow-sm border border-border/50"
                              : "text-muted-foreground hover:bg-surface-3 hover:text-foreground border border-transparent"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <span className={cn(
                              "text-[12.5px] font-medium leading-tight line-clamp-2",
                              isSelected ? "text-foreground" : "text-txt-1"
                            )}>
                              {session.task}
                            </span>
                            {session.status === "success" 
                              ? <CheckCircle2 className="size-3.5 text-agent-green mt-0.5 shrink-0" />
                              : <XCircle className="size-3.5 text-agent-red mt-0.5 shrink-0" />
                            }
                          </div>
                          <div className="flex items-center justify-between w-full mt-1">
                            <span className="text-[10px] font-mono text-txt-4 uppercase">{session.id.split('-')[1]}</span>
                            <span className="text-[10px] text-txt-4">{session.time}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Workspace Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a09]">
            {selectedSessionId === null ? (
               <AgentDetailView agent={selectedAgent} onStartSession={() => {}} />
            ) : (
               <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                 {/* Session Detail Header */}
                 <div className="max-w-4xl mx-auto w-full">
                   <div className="flex items-center gap-3 text-txt-3 text-[12px] mb-4">
                     <span className="font-mono bg-surface-2 px-1.5 py-0.5 rounded border border-border/50">{activeSession?.id}</span>
                     <span>•</span>
                     <span>{activeSession?.time}</span>
                   </div>
                   
                   <h1 className="text-2xl font-bold text-foreground leading-snug mb-8">
                     {activeSession?.task}
                   </h1>

                   {/* Metrics */}
                   <div className="grid grid-cols-4 gap-4 mb-10">
                    <div className="bg-surface-2/50 rounded-xl p-4 border border-border/40">
                      <div className="text-[11px] font-semibold text-txt-3 uppercase tracking-wider mb-2">Status</div>
                      <div className="flex items-center gap-2">
                        {activeSession?.status === "success" 
                          ? <><CheckCircle2 className="size-4 text-agent-green" /><span className="text-sm font-medium text-foreground">Completed</span></>
                          : <><XCircle className="size-4 text-agent-red" /><span className="text-sm font-medium text-foreground">Failed</span></>
                        }
                      </div>
                    </div>
                    <div className="bg-surface-2/50 rounded-xl p-4 border border-border/40">
                      <div className="text-[11px] font-semibold text-txt-3 uppercase tracking-wider mb-2">Duration</div>
                      <div className="text-lg font-medium font-mono text-foreground">{activeSession?.duration}</div>
                    </div>
                    <div className="bg-surface-2/50 rounded-xl p-4 border border-border/40">
                      <div className="text-[11px] font-semibold text-txt-3 uppercase tracking-wider mb-2">Turns</div>
                      <div className="text-lg font-medium font-mono text-foreground">{activeSession?.turns}</div>
                    </div>
                    <div className="bg-surface-2/50 rounded-xl p-4 border border-border/40">
                      <div className="text-[11px] font-semibold text-txt-3 uppercase tracking-wider mb-2">Tokens</div>
                      <div className="text-lg font-medium font-mono text-foreground">{activeSession?.tokens}</div>
                    </div>
                   </div>

                   {/* Mock Execution Log Area */}
                   <div className="space-y-6">
                     <h3 className="text-[13px] font-semibold text-txt-2 tracking-wider uppercase border-b border-border/50 pb-2">Execution Log</h3>
                     
                     <div className="rounded-xl border border-border/50 bg-background overflow-hidden shadow-sm">
                       <div className="bg-surface-2 px-4 py-2 border-b border-border/50 flex items-center gap-2">
                         <Terminal className="size-3.5 text-txt-3" />
                         <span className="text-[11px] font-mono text-txt-3">System prompt initialized</span>
                       </div>
                       <div className="p-6 space-y-6">
                         {/* Mock interaction */}
                         <div className="flex gap-4">
                           <div className="size-8 rounded-full bg-surface-3 border border-border/50 flex items-center justify-center shrink-0">
                             <span className="text-xs font-bold">U</span>
                           </div>
                           <div className="pt-1.5 flex-1">
                             <p className="text-[13.5px] text-foreground leading-relaxed">
                               {activeSession?.task}
                             </p>
                           </div>
                         </div>

                         <div className="flex gap-4">
                           <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                             <AgentIcon icon={selectedAgent?.icon || "Terminal"} className="size-4" />
                           </div>
                           <div className="pt-1.5 flex-1 space-y-4">
                             <p className="text-[13.5px] text-txt-1 leading-relaxed">
                               I'll start by analyzing the current workspace configuration to implement this effectively.
                             </p>
                             
                             <div className="bg-surface-2 border border-border/40 rounded-lg p-3 font-mono text-[12px] text-txt-3">
                               <div className="flex items-center gap-2 mb-2 text-[10px] text-txt-4 uppercase tracking-wider border-b border-border/40 pb-2">
                                 <Terminal className="size-3" /> Tool Call: run_shell_command
                               </div>
                               <div className="text-agent-green">$ npx shadcn add dropdown-menu</div>
                               <div className="mt-2 text-txt-4">✔ Installation complete</div>
                             </div>

                             <p className="text-[13.5px] text-txt-1 leading-relaxed">
                               The components are installed. Proceeding to update the layout files.
                             </p>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>

                 </div>
               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
