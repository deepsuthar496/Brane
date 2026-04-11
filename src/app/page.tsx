"use client";

import { useState, useEffect } from "react";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AgentListItem, AddAgentListItem } from "@/components/agents/agent-list-item";
import { AgentDetailView, Session } from "@/components/agents/agent-detail";
import { Agent, AgentStatus } from "@/lib/data";

// ── Mock session data ──────────────────────────────────

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
  },
];

// ── Page ───────────────────────────────────────────────

export default function AgentsPage() {
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
            // Get initial status for each agent
            const updatedAgents = await Promise.all((discovered || []).map(async (agent) => {
              const { status } = await window.electronAPI.getAgentStatus(agent.id);
              return { ...agent, status: status as AgentStatus };

            }));
            
            setAgents(updatedAgents);
            if (updatedAgents.length > 0 && !selectedAgentId) {
              setSelectedAgentId(updatedAgents[0].id);
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
  }, [selectedAgentId]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;

    const unsubs: (() => void)[] = [];

    agents.forEach(agent => {
      const unsub = window.electronAPI.onAgentStatus(agent.id, (data) => {
        setAgents(prev => prev.map(a => 
          a.id === agent.id ? { ...a, status: data.status as AgentStatus } : a
        ));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [agents]);

  const handleStartAgent = async () => {
    if (!selectedAgent || typeof window === "undefined" || !window.electronAPI) return;
    const command = selectedAgent.id === "gemini-cli" ? "gemini" : selectedAgent.id;
    await window.electronAPI.startAgent({ id: selectedAgent.id, command });
  };

  const handleStopAgent = async () => {
    if (!selectedAgent || typeof window === "undefined" || !window.electronAPI) return;
    await window.electronAPI.stopAgent(selectedAgent.id);
  };

  const handleRestartAgent = async () => {
    if (!selectedAgent || typeof window === "undefined" || !window.electronAPI) return;
    await window.electronAPI.stopAgent(selectedAgent.id);
    // Brief delay to ensure it's stopped before restarting
    setTimeout(async () => {
      const command = selectedAgent.id === "gemini-cli" ? "gemini" : selectedAgent.id;
      await window.electronAPI.startAgent({ id: selectedAgent.id, command });
    }, 500);
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;
  const agentSessions = MOCK_SESSIONS.filter(s => s.agentId === selectedAgentId);

  const runningCount = agents.filter(a => a.status === "running").length;

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex overflow-hidden bg-background">

          {/* ── Left Panel: Agent List ─────────────── */}
          <div className="w-[280px] bg-surface-2/20 border-r border-border/50 flex flex-col shrink-0">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 shrink-0">
              <div className="flex items-center justify-between mb-0.5">
                <h1 className="text-[14px] font-bold text-foreground tracking-tight">Agents</h1>
                <span className="text-[10.5px] font-mono text-txt-4 bg-surface-2 px-1.5 py-0.5 rounded">
                  {runningCount}/{agents.length} active
                </span>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-surface-2/40 animate-pulse" />
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[12px] text-txt-3">No agents discovered.</p>
                  <p className="text-[11px] text-txt-4 mt-1">Install a CLI agent to get started.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {agents.map((agent) => (
                    <AgentListItem
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      onSelect={() => setSelectedAgentId(agent.id)}
                    />
                  ))}
                  <div className="pt-2">
                    <AddAgentListItem />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: Agent Detail ──────────── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a09]">
            <AgentDetailView
              agent={selectedAgent}
              sessions={agentSessions}
              onStartSession={handleStartAgent}
              onStopAgent={handleStopAgent}
              onRestartAgent={handleRestartAgent}
            />
          </div>

        </main>
      </div>
    </div>
  );
}
