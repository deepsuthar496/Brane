"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@/lib/data";
import { AgentIcon } from "./agent-icon";
import {
  Terminal,
  Settings2,
  Copy,
  Check,
  ShieldCheck,
  Server,
  Sparkles,
  Flag,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

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

// ── Tag Styles ─────────────────────────────────────────

const tagStyles: Record<string, string> = {
  mcp: "bg-agent-purple-dim text-agent-purple border-transparent",
  skill: "bg-agent-green-dim text-agent-green border-transparent",
  flag: "bg-muted text-muted-foreground border-border",
  error: "bg-agent-red-dim text-agent-red border-transparent",
};

// ── Copy Button ────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-surface-3 transition-colors text-txt-4 hover:text-txt-2"
      title="Copy to clipboard"
    >
      {copied ? <Check className="size-3.5 text-agent-green" /> : <Copy className="size-3.5" />}
    </button>
  );
}

// ── Tab Definitions ────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "config", label: "Configuration" },
  { id: "sessions", label: "Sessions" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Main Component ─────────────────────────────────────

interface AgentDetailViewProps {
  agent: Agent | null;
  sessions?: Session[];
  onStartSession?: () => void;
}

export function AgentDetailView({ agent, sessions = [], onStartSession }: AgentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  if (!agent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
        <div className="size-14 rounded-xl bg-surface-2 border border-border/50 flex items-center justify-center mb-4">
          <Terminal className="size-6 text-txt-4" />
        </div>
        <h2 className="text-base font-semibold text-foreground">No Agent Selected</h2>
        <p className="text-[13px] text-txt-3 mt-1.5 max-w-sm leading-relaxed">
          Select an agent from the list to view its configuration, status, and session history.
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ──────────────────────────────────── */}
      <div className="px-8 pt-7 pb-0 shrink-0">
        <div className="flex items-start gap-4 mb-6">
          <div className="size-14 rounded-xl border border-border/50 bg-surface-3 flex items-center justify-center shrink-0">
            <AgentIcon icon={agent.icon} className="size-7" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {agent.name}
              </h2>
              <StatusBadge status={statusType} label={statusLabel} />
            </div>
            <div className="flex items-center gap-2 text-[12px] text-txt-3 font-mono">
              <span className="bg-surface-2 px-1.5 py-0.5 rounded text-txt-2">{agent.version}</span>
              <span className="text-border">·</span>
              <span>{agent.provider}</span>
            </div>
            {agent.fullPath && (
              <p className="text-[11px] text-txt-4 font-mono mt-2 truncate max-w-lg" title={agent.fullPath}>
                {agent.fullPath}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-[12px]">
              <Settings2 className="size-3.5" />
              Configure
            </Button>
            <Button size="sm" onClick={onStartSession} className="gap-1.5 h-8 text-[12px]">
              <Terminal className="size-3.5" />
              Launch Agent
            </Button>
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────── */}
        <div className="flex items-center gap-0 border-b border-border/40">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-4 py-2.5 text-[12.5px] font-medium transition-colors",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-txt-3 hover:text-txt-2",
              )}
            >
              {tab.label}
              {tab.id === "sessions" && sessions.length > 0 && (
                <span className="ml-1.5 text-[10px] font-mono text-txt-4">{sessions.length}</span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === "overview" && <OverviewTab agent={agent} />}
        {activeTab === "config" && <ConfigTab agent={agent} />}
        {activeTab === "sessions" && <SessionsTab sessions={sessions} agent={agent} />}
      </div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────

function OverviewTab({ agent }: { agent: Agent }) {
  const stats = [
    { icon: Server, label: "MCP Servers", value: agent.mcps, color: "text-agent-purple" },
    { icon: Sparkles, label: "Active Skills", value: agent.skills, color: "text-agent-green" },
    { icon: Flag, label: "CLI Flags", value: agent.flags, color: "text-agent-blue" },
  ];

  return (
    <div className="max-w-3xl space-y-8">
      {/* Capacity */}
      <section>
        <h3 className="text-[11px] font-bold text-txt-4 uppercase tracking-wider mb-3">
          Capacity
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-2/60 border border-border/30 rounded-xl px-4 py-4 flex items-center gap-3 group hover:border-border/50 transition-colors"
            >
              <div className={cn("size-9 rounded-lg bg-background border border-border/30 flex items-center justify-center", stat.color)}>
                <stat.icon className="size-4" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground tabular-nums leading-none">
                  {stat.value}
                </div>
                <div className="text-[10.5px] text-txt-4 font-medium mt-1">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Configuration Status */}
      <section>
        <h3 className="text-[11px] font-bold text-txt-4 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          Configuration Status
        </h3>
        <div className="bg-surface-2/40 border border-border/30 rounded-xl p-4">
          {!agent.discovered && (
            <Badge variant="destructive" className="mb-2 text-[11px]">
              CLI not found in PATH
            </Badge>
          )}
          {agent.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {agent.tags.map((tag) => (
                <span
                  key={tag.label}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1 rounded-md border",
                    tagStyles[tag.type]
                  )}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-txt-3">
              No tags associated. Default configuration applies.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Configuration Tab ──────────────────────────────────

function ConfigTab({ agent }: { agent: Agent }) {
  const agentCmdName = agent.name.toLowerCase().replace(/\s+/g, "-");
  const commands = [
    `${agentCmdName} --help`,
    `${agentCmdName} start --verbose`,
    `${agentCmdName} --version`,
  ];

  return (
    <div className="max-w-3xl space-y-8">
      {/* Integration Commands */}
      <section>
        <h3 className="text-[11px] font-bold text-txt-4 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Terminal className="size-3.5 text-agent-blue" />
          Integration Commands
        </h3>
        <div className="space-y-2">
          {commands.map((cmd) => (
            <div
              key={cmd}
              className="bg-surface-2/60 border border-border/30 rounded-lg px-4 py-3 font-mono text-[12px] flex items-center justify-between group hover:border-border/50 transition-colors"
            >
              <span className="text-txt-2">{cmd}</span>
              <CopyButton text={cmd} />
            </div>
          ))}
        </div>
      </section>

      {/* Path Info */}
      {agent.fullPath && (
        <section>
          <h3 className="text-[11px] font-bold text-txt-4 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ExternalLink className="size-3.5 text-txt-3" />
            Executable Path
          </h3>
          <div className="bg-surface-2/60 border border-border/30 rounded-lg px-4 py-3 font-mono text-[12px] flex items-center justify-between group hover:border-border/50 transition-colors">
            <span className="text-txt-3 truncate mr-3">{agent.fullPath}</span>
            <CopyButton text={agent.fullPath} />
          </div>
        </section>
      )}

      {/* Flags */}
      {agent.tags.filter(t => t.type === "flag").length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold text-txt-4 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Flag className="size-3.5 text-agent-amber" />
            Active Flags
          </h3>
          <div className="space-y-1.5">
            {agent.tags.filter(t => t.type === "flag").map((flag) => (
              <div
                key={flag.label}
                className="bg-surface-2/60 border border-border/30 rounded-lg px-4 py-2.5 font-mono text-[12px] text-txt-2 flex items-center justify-between hover:border-border/50 transition-colors"
              >
                <span>{flag.label}</span>
                <CopyButton text={flag.label} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sessions Tab ───────────────────────────────────────

function SessionsTab({ sessions, agent }: { sessions: Session[]; agent: Agent }) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-12 rounded-xl bg-surface-2 border border-border/40 flex items-center justify-center mb-3">
          <MessageSquare className="size-5 text-txt-4" />
        </div>
        <p className="text-[13px] font-medium text-txt-2">No sessions yet</p>
        <p className="text-[11.5px] text-txt-4 mt-1 max-w-xs">
          Launch {agent.name} to start a new session. Session history will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-2">
      {sessions.map((session) => (
        <button
          key={session.id}
          className="w-full bg-surface-2/40 border border-border/30 rounded-xl px-5 py-4 text-left hover:border-border/50 hover:bg-surface-2/60 transition-all group"
        >
          <div className="flex items-start gap-3">
            {/* Status icon */}
            <div className="mt-0.5 shrink-0">
              {session.status === "success" ? (
                <CheckCircle2 className="size-4 text-agent-green" />
              ) : (
                <XCircle className="size-4 text-agent-red" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground leading-tight line-clamp-1 group-hover:text-foreground">
                {session.task}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10.5px] text-txt-4 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="size-2.5" />
                  {session.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="size-2.5" />
                  {session.tokens} tokens
                </span>
                <span>{session.turns} turns</span>
              </div>
            </div>

            {/* Time + arrow */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10.5px] text-txt-4">{session.time}</span>
              <ArrowRight className="size-3.5 text-txt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
