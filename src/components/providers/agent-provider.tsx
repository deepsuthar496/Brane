"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Agent, AgentStatus } from "@/lib/data";

interface AgentContextType {
  agents: Agent[];
  isLoading: boolean;
  refreshAgents: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCLIs = useCallback(async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;

    try {
      setIsLoading(true);
      const discovered = await window.electronAPI.discoverCLIs();

      // Get initial status for each agent
      const updatedAgents = await Promise.all((discovered || []).map(async (agent: any) => {
        const { status } = await window.electronAPI.getAgentStatus(agent.id);
        return { ...agent, status: status as AgentStatus };
      }));

      setAgents(updatedAgents);
    } catch (err) {
      console.error("AgentProvider: Failed to discover CLIs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial discovery
  useEffect(() => {
    fetchCLIs();
  }, [fetchCLIs]);

  // Listen for sudden token refreshes from settings
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleRefresh = () => {
      console.log("[AgentProvider] Token updated, refreshing registry...");
      fetchCLIs();
    };

    window.addEventListener("brane:github-token-updated", handleRefresh);
    return () => window.removeEventListener("brane:github-token-updated", handleRefresh);
  }, [fetchCLIs]);

  // Status subscriptions
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI || agents.length === 0) return;

    const unsubs: (() => void)[] = [];

    agents.forEach(agent => {
      const unsub = window.electronAPI.onAgentStatus(agent.id, (data: { status: string }) => {
        setAgents(prev => prev.map(a =>
          a.id === agent.id ? { ...a, status: data.status as AgentStatus } : a
        ));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.map(a => a.id).join(',')]);

  return (
    <AgentContext.Provider value={{ agents, isLoading, refreshAgents: fetchCLIs }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgents must be used within an AgentProvider");
  }
  return context;
}
