"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/lib/data";
import { AgentIcon } from "./agent-icon";
import { Terminal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentSessions } from "./agent-sessions";

const tagStyles: Record<string, string> = {
  mcp: "bg-agent-purple-dim text-agent-purple border-transparent",
  skill: "bg-agent-green-dim text-agent-green border-transparent",
  flag: "bg-muted text-muted-foreground border-border",
  error: "bg-agent-red-dim text-agent-red border-transparent",
};

interface AgentDetailViewProps {
  agent: Agent | null;
}

export function AgentDetailView({ agent }: AgentDetailViewProps) {
  if (!agent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Terminal className="size-12 opacity-20 mb-4" />
        <p className="text-sm font-medium">No agent selected</p>
        <p className="text-xs text-txt-3 mt-1">
          Select an agent from the explorer to view details.
        </p>
      </div>
    );
  }

  const statusLabel =
    agent.status === "running"
      ? "Running"
      : agent.status === "stopped"
      ? "Stopped"
      : "Error";
  const statusType =
    agent.status === "running"
      ? "active"
      : agent.status === "stopped"
      ? "inactive"
      : "error";

  return (
    <div className="flex-1 flex flex-col p-8 bg-card rounded-xl border border-border/50 shadow-sm relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-start gap-4 mb-8 shrink-0">
        <div className="size-14 rounded-xl border border-border/50 bg-surface-3 flex items-center justify-center text-2xl shrink-0 shadow-sm">
          <AgentIcon icon={agent.icon} className="size-8" />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
              {agent.name}
            </h2>
            <StatusBadge status={statusType} label={statusLabel} />
          </div>
          <p className="text-[13px] text-txt-3 font-mono mt-1.5">
            {agent.version} <span className="text-border mx-2">•</span> {agent.provider}
          </p>
          {agent.fullPath && (
            <p className="text-[11px] text-txt-3 font-mono mt-2 bg-surface-2 px-2 py-1 rounded border border-border/40 truncate" title={agent.fullPath}>
              {agent.fullPath}
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-transparent border-b border-border/60 w-full justify-start rounded-none h-auto p-0 gap-8 mb-6 shrink-0">
          <TabsTrigger 
            value="overview" 
            className="rounded-none border-b-2 border-transparent data-active:border-primary data-active:bg-transparent px-0 pb-3 text-[13px] font-bold uppercase tracking-widest text-txt-4 data-active:text-primary transition-colors"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="sessions" 
            className="rounded-none border-b-2 border-transparent data-active:border-primary data-active:bg-transparent px-0 pb-3 text-[13px] font-bold uppercase tracking-widest text-txt-4 data-active:text-primary transition-colors"
          >
            Sessions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="flex-1 overflow-y-auto focus-visible:ring-0 pr-2">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { val: agent.mcps, label: "MCP Servers Configured" },
              { val: agent.skills, label: "Active Skills" },
              { val: agent.flags, label: "CLI Flags Set" },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-2 rounded-lg p-4 border border-border/40">
                <div className="text-2xl font-semibold text-foreground tabular-nums mb-1">
                  {stat.val}
                </div>
                <div className="text-[11px] text-txt-3 font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tags details */}
          <div>
            <h3 className="text-[11px] font-semibold text-txt-3 uppercase tracking-wider mb-3">
              Configuration Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {!agent.discovered && (
                 <span className={cn("text-[11.5px] font-medium px-2.5 py-1 rounded-md border", tagStyles.error)}>
                    System: CLI not found in PATH
                 </span>
              )}
              {agent.tags.map((tag) => (
                <span
                  key={tag.label}
                  className={cn(
                    "text-[11.5px] font-medium px-2.5 py-1 rounded-md border",
                    tagStyles[tag.type]
                  )}
                >
                  {tag.label}
                </span>
              ))}
              {agent.tags.length === 0 && agent.discovered && (
                <span className="text-xs text-txt-3 italic">No tags associated.</span>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="sessions" className="flex-1 overflow-y-auto focus-visible:ring-0 pr-2 h-full">
          <AgentSessions agentId={agent.id} />
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 pt-6 border-t border-border/50 shrink-0 mt-6">
        <Button variant="outline" className="flex-1">
          Configure Agent
        </Button>
        <Button variant="outline" className="flex-1">
          View Logs
        </Button>
        <Button
          className={cn(
            "flex-1",
            agent.status === "error" && "opacity-50 cursor-not-allowed"
          )}
          disabled={agent.status === "error"}
        >
          Launch Terminal
        </Button>
      </div>
    </div>
  );
}
