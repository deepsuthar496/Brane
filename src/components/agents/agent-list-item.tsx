"use client";

import { cn } from "@/lib/utils";
import { AgentIcon } from "./agent-icon";
import type { Agent } from "@/lib/data";
import { Server, Sparkles, Flag } from "lucide-react";
import { useRouter } from "next/navigation";

interface AgentListItemProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
}

export function AgentListItem({ agent, isSelected, onSelect }: AgentListItemProps) {
  const hasError = agent.status === "error";
  const isRunning = agent.status === "running";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
        "border border-transparent",
        isSelected
          ? "bg-surface-3 border-border/60"
          : "hover:bg-surface-2/60"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "size-9 rounded-[10px] border flex items-center justify-center shrink-0 transition-colors",
        isSelected
          ? "bg-surface-3 border-border/50 text-foreground"
          : "bg-surface-2 border-border/30 text-txt-3 group-hover:text-foreground"
      )}>
        <AgentIcon icon={agent.icon} className="size-[18px]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-[13px] font-semibold truncate leading-tight",
          isSelected ? "text-foreground" : "text-txt-1"
        )}>
          {agent.name}
        </div>
        <div className="text-[10.5px] text-txt-4 font-mono mt-0.5 truncate">
          {agent.version} · {agent.provider}
        </div>
      </div>

      {/* Inline stat badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {agent.mcps > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-txt-3 bg-surface-2 px-1.5 py-0.5 rounded font-mono">
            <Server className="size-2.5 opacity-50" />
            {agent.mcps}
          </span>
        )}
        {agent.skills > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-txt-3 bg-surface-2 px-1.5 py-0.5 rounded font-mono">
            <Sparkles className="size-2.5 opacity-50" />
            {agent.skills}
          </span>
        )}
        {agent.flags > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-txt-3 bg-surface-2 px-1.5 py-0.5 rounded font-mono">
            <Flag className="size-2.5 opacity-50" />
            {agent.flags}
          </span>
        )}
      </div>

      {/* Status dot */}
      <div className={cn(
        "size-2 rounded-full shrink-0",
        isRunning && "bg-agent-green shadow-[0_0_0_3px_var(--agent-green-dim)]",
        agent.status === "stopped" && "bg-txt-4",
        hasError && "bg-agent-red shadow-[0_0_0_3px_var(--agent-red-dim)]"
      )} />
    </button>
  );
}

export function AddAgentListItem() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.push("/store")}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border border-dashed border-border/40 hover:border-border/70 hover:bg-surface-2/40 group"
    >
      <div className="size-9 rounded-[10px] border border-dashed border-border/40 bg-surface-2/50 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-4 group-hover:text-txt-3 transition-colors">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <div>
        <div className="text-[12px] font-medium text-txt-3 group-hover:text-txt-2 transition-colors">Add Agent</div>
        <div className="text-[10px] text-txt-4 mt-px">Connect a CLI or agent tool</div>
      </div>
    </button>
  );
}
