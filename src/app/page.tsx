"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AgentListItem, AddAgentListItem } from "@/components/agents/agent-list-item";
import { AgentDetailView, Session } from "@/components/agents/agent-detail";
import { useAgents } from "@/components/providers/agent-provider";

// ── Main Page ─────────────────────────────────────

export default function AgentsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <AgentsPageContent />
    </Suspense>
  );
}

function AgentsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryId = searchParams.get("agent");

  const { agents, isLoading } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(queryId);
  const [customCwd, setCustomCwd] = useState<string | null>(null);

  // Sync with URL params
  useEffect(() => {
    if (queryId && queryId !== selectedAgentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAgentId(queryId);
    }
  }, [queryId, selectedAgentId]);

  // Set initial selected agent once agents load
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      const initialId = queryId || agents[0].id;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAgentId(initialId);
    }
  }, [agents, selectedAgentId, queryId]);

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("agent", id);
    router.replace(`/?${params.toString()}`);
  };

  const projectRoot = typeof window !== 'undefined' ? localStorage.getItem("brane_last_folder") : null;
  const effectiveCwd = customCwd || projectRoot || undefined;

  const handleChangeDirectory = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.browseFiles({
      properties: ["openDirectory"],
      title: "Select Agent Launch Directory"
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      setCustomCwd(result.filePaths[0]);
    }
  };

  const handleStartAgent = async () => {
    if (!selectedAgent || typeof window === "undefined" || !window.electronAPI) return;
    const command = selectedAgent.fullPath || (selectedAgent.id === "gemini-cli" ? "gemini" : selectedAgent.id);
    console.log(`[App] Starting agent ${selectedAgent.id} in ${effectiveCwd} with command: ${command}`);
    await window.electronAPI.startAgent({ id: selectedAgent.id, command, cwd: effectiveCwd });
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
      const command = selectedAgent.fullPath || (selectedAgent.id === "gemini-cli" ? "gemini" : selectedAgent.id);
      await window.electronAPI.startAgent({ id: selectedAgent.id, command, cwd: effectiveCwd });
    }, 500);
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;
  const agentSessions: Session[] = [];

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
                      onSelect={() => handleSelectAgent(agent.id)}
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
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <AgentDetailView
              agent={selectedAgent}
              sessions={agentSessions}
              launchCwd={effectiveCwd}
              onDirectoryChange={handleChangeDirectory}
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
