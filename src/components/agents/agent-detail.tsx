"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/lib/data";
import { AgentIcon } from "./agent-icon";
import { Terminal, Settings2, Code, ShieldCheck } from "lucide-react";

const tagStyles: Record<string, string> = {
  mcp: "bg-agent-purple-dim text-agent-purple border-transparent",
  skill: "bg-agent-green-dim text-agent-green border-transparent",
  flag: "bg-muted text-muted-foreground border-border",
  error: "bg-agent-red-dim text-agent-red border-transparent",
};

interface AgentDetailViewProps {
  agent: Agent | null;
  onStartSession?: () => void;
}

export function AgentDetailView({ agent, onStartSession }: AgentDetailViewProps) {
  if (!agent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-[#0a0a09] h-full">
        <div className="size-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-4">
          <Terminal className="size-6 text-txt-3" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Welcome to Gemini CLI</h2>
        <p className="text-sm text-txt-3 mt-2 max-w-md">
          Select an agent from the dropdown menu to view configurations or start a new session.
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
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex items-start gap-4 mb-10 pb-8 border-b border-border/40">
          <div className="size-16 rounded-xl border border-border/50 bg-surface-3 flex items-center justify-center text-2xl shrink-0 shadow-sm">
            <AgentIcon icon={agent.icon} className="size-8" />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {agent.name}
              </h2>
              <StatusBadge status={statusType} label={statusLabel} />
            </div>
            <p className="text-[13px] text-txt-3 font-mono mt-1.5 flex items-center gap-2">
              <span className="bg-surface-2 px-1.5 py-0.5 rounded text-txt-2">{agent.version}</span>
              <span className="text-border">•</span>
              <span>{agent.provider}</span>
            </p>
            {agent.fullPath && (
              <p className="text-[11px] text-txt-4 font-mono mt-3 truncate max-w-xl" title={agent.fullPath}>
                {agent.fullPath}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Settings2 className="size-4" />
              Configure
            </Button>
            <Button onClick={onStartSession} className="gap-2">
              <Terminal className="size-4" />
              Launch Agent
            </Button>
          </div>
        </div>

        {/* Two Column Layout for Config & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-8">
            {/* System Status */}
            <div>
               <h3 className="text-[13px] font-semibold text-txt-2 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <ShieldCheck className="size-4 text-primary" /> Configuration Status
               </h3>
               <div className="bg-surface-2 rounded-xl p-5 border border-border/40 space-y-4">
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
                      <span className="text-xs text-txt-3 italic">No tags associated. Default configuration applies.</span>
                    )}
                  </div>
               </div>
            </div>

            {/* Quick Actions / Integration */}
            <div>
              <h3 className="text-[13px] font-semibold text-txt-2 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <Code className="size-4 text-agent-blue" /> Integration Commands
               </h3>
               <div className="space-y-2">
                 <div className="bg-surface-2 border border-border/40 rounded-lg p-3 font-mono text-[12px] flex items-center justify-between group cursor-pointer hover:border-border transition-colors">
                   <span className="text-txt-2">gemini-cli --help</span>
                   <span className="text-[10px] text-txt-4 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
                 </div>
                 <div className="bg-surface-2 border border-border/40 rounded-lg p-3 font-mono text-[12px] flex items-center justify-between group cursor-pointer hover:border-border transition-colors">
                   <span className="text-txt-2">gemini-cli start --verbose</span>
                   <span className="text-[10px] text-txt-4 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[13px] font-semibold text-txt-2 uppercase tracking-wider mb-4">Capacity</h3>
            {[
              { val: agent.mcps, label: "MCP Servers Configured" },
              { val: agent.skills, label: "Active Skills" },
              { val: agent.flags, label: "CLI Flags Set" },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-2/50 rounded-xl p-5 border border-border/40 flex flex-col justify-center h-24">
                <div className="text-3xl font-semibold text-foreground tabular-nums mb-1 leading-none">
                  {stat.val}
                </div>
                <div className="text-[10px] text-txt-4 font-bold uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
