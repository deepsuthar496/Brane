"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/lib/data";

const gradientMap: Record<string, string> = {
  claude: "from-orange-400 to-orange-300",
  gemini: "from-blue-500 to-green-500",
  codex: "from-emerald-500 to-cyan-500",
  cursor: "from-violet-500 to-pink-500",
  openclaw: "from-amber-500 to-red-500",
  openai: "from-emerald-600 to-teal-600",
};

const tagStyles: Record<string, string> = {
  mcp: "bg-agent-purple-dim text-primary border-transparent",
  skill: "bg-agent-green-dim text-agent-green border-transparent",
  flag: "bg-muted text-muted-foreground border-border",
  error: "bg-agent-red-dim text-agent-red border-transparent",
};

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
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
    <article
      tabIndex={0}
      aria-label={`${agent.name} agent`}
      className={cn(
        "group bg-card border border-border rounded-xl p-4 cursor-pointer transition-all relative overflow-hidden",
        "hover:border-input hover:bg-surface-2",
        "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      )}
    >
      {/* Top gradient bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity",
          gradientMap[agent.colorClass] || "from-gray-500 to-gray-400"
        )}
      />

      {/* Top: icon + meta + status */}
      <div className="flex items-center gap-3 mb-3.5">
        <div className="size-[38px] rounded-[10px] border border-border bg-muted flex items-center justify-center text-lg shrink-0">
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground tracking-tight">
            {agent.name}
          </div>
          <div className="text-[11px] text-txt-3 font-mono mt-px">
            {agent.version} · {agent.provider}
          </div>
        </div>
        <StatusBadge status={statusType} label={statusLabel} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3.5">
        {[
          { val: agent.mcps, label: "MCPs" },
          { val: agent.skills, label: "Skills" },
          { val: agent.flags, label: "Flags" },
        ].map((stat) => (
          <div key={stat.label} className="bg-muted rounded-[7px] px-2.5 py-2">
            <div className="text-sm font-semibold text-foreground tabular-nums">
              {stat.val}
            </div>
            <div className="text-[10px] text-txt-3 mt-px">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-[5px]">
        {agent.tags.map((tag) => (
          <span
            key={tag.label}
            className={cn(
              "text-[10.5px] font-medium px-2 py-[2px] rounded border",
              tagStyles[tag.type]
            )}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 mt-3.5 pt-3.5 border-t border-border">
        <Button variant="outline" size="sm" className="flex-1 h-[30px] text-xs">
          Configure
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-[30px] text-xs">
          Logs
        </Button>
        <Button
          size="sm"
          className={cn(
            "flex-1 h-[30px] text-xs",
            agent.status === "error" && "opacity-50 cursor-not-allowed"
          )}
          disabled={agent.status === "error"}
        >
          Launch
        </Button>
      </div>
    </article>
  );
}

export function AddAgentCard() {
  return (
    <article
      tabIndex={0}
      aria-label="Add a new agent"
      className="bg-card border border-dashed border-border rounded-xl p-8 cursor-pointer flex flex-col items-center justify-center gap-2.5 hover:border-input hover:bg-surface-2 transition-all focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="size-10 rounded-[10px] bg-muted border border-dashed border-input flex items-center justify-center">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-40"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[13px] font-medium text-muted-foreground">
          Add Agent
        </div>
        <div className="text-xs text-txt-3 mt-[3px]">
          Connect a new CLI or agent
        </div>
      </div>
    </article>
  );
}
