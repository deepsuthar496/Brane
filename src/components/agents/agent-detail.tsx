"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import type { Agent } from "@/lib/data";
import { AgentIcon } from "./agent-icon";
import dynamic from "next/dynamic";

const XTerminal = dynamic(() => import("./xterminal").then((mod) => mod.XTerminal), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0c0c0b] rounded-xl flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

import {
  Terminal as TerminalIcon,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Flag,
  FolderOpen,
  Edit3
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

export interface CliFlag {
  name: string;
  description: string;
  category: string;
  dangerLevel: "high" | "low" | "none";
  type: string;
  example?: string;
  deprecated: boolean;
}

const tagStyles: Record<string, string> = {
  mcp: "bg-agent-purple-dim text-agent-purple border-transparent",
  skill: "bg-agent-green-dim text-agent-green border-transparent",
  flag: "bg-muted text-muted-foreground border-border",
  error: "bg-agent-red-dim text-agent-red border-transparent",
};

// ── Components ────────────────────────────────────────

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
    <button onClick={handleCopy} className="p-1 rounded hover:bg-surface-3 transition-colors text-txt-4 hover:text-txt-2" title="Copy">
      {copied ? <Check className="size-3.5 text-agent-green" /> : <Copy className="size-3.5" />}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "terminal", label: "Terminal" },
  { id: "config", label: "Flags" },
  { id: "sessions", label: "Sessions" },
] as const;

type TabId = typeof TABS[number]["id"];

interface AgentDetailViewProps {
  agent: Agent | null;
  sessions?: Session[];
  launchCwd?: string;
  onStartSession?: () => void;
  onStopAgent?: () => void;
  onRestartAgent?: () => void;
  onDirectoryChange?: () => void;
}

export function AgentDetailView({ 
  agent, 
  sessions = [], 
  launchCwd,
  onStartSession, 
  onStopAgent, 
  onRestartAgent,
  onDirectoryChange
}: AgentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  if (!agent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
        <div className="size-14 rounded-xl bg-surface-2 border border-border/50 flex items-center justify-center mb-4">
          <TerminalIcon className="size-6 text-txt-4" />
        </div>
        <h2 className="text-base font-semibold text-foreground">No Agent Selected</h2>
        <p className="text-[13px] text-txt-3 mt-1.5 max-w-sm leading-relaxed">
          Select an agent from the list to view its configuration, status, and session history.
        </p>
      </div>
    );
  }

  const handleLaunch = () => {
    setActiveTab("terminal");
    onStartSession?.();
  };

  const statusLabel = agent.status === "running" ? "Running" : agent.status === "stopped" ? "Stopped" : "Error";
  const statusType = agent.status === "running" ? "active" : agent.status === "stopped" ? "inactive" : "error";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ──────────────────────────────────── */}
      <div className="px-4 sm:px-8 pt-7 pb-0 shrink-0">
        <div className="flex flex-col xl:flex-row items-start gap-4 xl:gap-6 mb-6">
          <div className="flex items-start gap-4 min-w-0 w-full xl:w-auto flex-1">
            <div className="size-14 rounded-xl border border-border/50 bg-surface-3 flex items-center justify-center shrink-0 text-foreground shadow-sm">
              <AgentIcon icon={agent.icon} className="size-7" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center flex-wrap gap-2.5 mb-1">
                <h2 className="text-xl font-bold text-foreground tracking-tight truncate">
                  {agent.name}
                </h2>
                <StatusBadge status={statusType} label={statusLabel} />
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-[12px] text-txt-3 font-mono">
                <span className="bg-surface-2 px-1.5 py-0.5 rounded text-txt-2 shrink-0">{agent.version}</span>
                <span className="text-border shrink-0">·</span>
                <span className="truncate">{agent.provider}</span>
                
                {launchCwd && (
                  <>
                    <span className="text-border shrink-0 hidden sm:inline">·</span>
                    <button 
                      onClick={onDirectoryChange}
                      className="group flex items-center gap-1.5 text-primary/70 hover:text-primary transition-colors truncate max-w-[300px]"
                      title="Click to change launch directory"
                    >
                      <FolderOpen className="size-3.5 shrink-0" />
                      <span className="truncate border-b border-dashed border-primary/20 group-hover:border-primary/50 pb-0.5">
                        {launchCwd.split(/[\\/]/).pop() || launchCwd}
                      </span>
                      <Edit3 className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </>
                )}
              </div>

              {/* Binary Path */}
              {agent.fullPath && (
                <div className="flex items-center gap-2 mt-2 text-[10.5px] font-mono text-txt-4 leading-none group/path">
                  <div className="flex items-center gap-1 opacity-40 select-none tracking-widest uppercase text-[9px] font-bold border border-border/40 px-1 rounded">
                    <TerminalIcon className="size-2.5" />
                    BIN
                  </div>
                  <span className="truncate max-w-[450px] opacity-60 group-hover/path:opacity-100 transition-opacity">
                    {agent.fullPath}
                  </span>
                  <div className="opacity-0 group-hover/path:opacity-100 transition-opacity flex items-center">
                    <CopyButton text={agent.fullPath} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2 shrink-0 w-full xl:w-auto mt-2 xl:mt-0">
            {agent.status === "running" ? (
              <>
                <Button variant="outline" size="sm" onClick={onRestartAgent} className="gap-1.5 h-8 text-[12px] border-agent-blue/50 text-agent-blue hover:bg-agent-blue/10 flex-1 sm:flex-initial">
                  <Zap className="size-3.5" />
                  Restart
                </Button>
                <Button variant="destructive" size="sm" onClick={onStopAgent} className="gap-1.5 h-8 text-[12px] bg-agent-red hover:bg-agent-red/90 flex-1 sm:flex-initial">
                  <XCircle className="size-3.5" />
                  Stop
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleLaunch} className="gap-1.5 h-8 text-[12px] w-full sm:w-auto shadow-lg shadow-primary/10">
                <TerminalIcon className="size-3.5" />
                Launch Agent
              </Button>
            )}
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────── */}
        <div className="flex items-center gap-0 border-b border-border/40 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-4 py-2.5 text-[12.5px] font-medium transition-colors shrink-0 flex items-center gap-2",
                activeTab === tab.id ? "text-foreground" : "text-txt-3 hover:text-txt-2",
              )}
            >
              {tab.label}
              {tab.id === "terminal" && agent.status === "running" && (
                <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              )}
              {tab.id === "sessions" && sessions.length > 0 && (
                <span className="ml-0.5 text-[10px] font-mono text-txt-4 bg-muted/40 px-1 rounded">{sessions.length}</span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────── */}
      <div className={cn("flex-1 overflow-hidden", activeTab !== "terminal" ? "px-4 sm:px-8 py-6" : "p-0")}>
        <div className={cn("h-full", activeTab !== "terminal" && "max-w-5xl")}>
          {activeTab === "overview" && <OverviewTab agent={agent} />}
          {activeTab === "terminal" && (
            <XTerminal 
              key={agent.id}
              agentId={agent.id}
              isRunning={agent.status === "running"} 
              onData={(data) => {
                if (window.electronAPI) {
                  window.electronAPI.sendAgentInput({ id: agent.id, data });
                }
              }}
            />
          )}
          {activeTab === "config" && <ConfigTab agent={agent} />}
          {activeTab === "sessions" && <SessionsTab sessions={sessions} agent={agent} />}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────

function OverviewTab({ agent }: { agent: Agent }) {
  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 px-1">
      {/* Brief info section */}
      <div className="p-5 rounded-2xl bg-surface-2/20 border border-border/30 backdrop-blur-sm shadow-inner">
        <p className="text-[13.5px] text-txt-2 leading-relaxed font-medium">
          {agent.name} is a high-performance CLI agent integrated into Brane Hub. 
          Use the <span className="text-primary/80 font-bold">Terminal</span> to start a live session or configure 
          runtime behavior in the <span className="text-primary/80 font-bold">Flags</span> tab.
        </p>
      </div>
    </div>
  );
}

// ── Configuration Tab ──────────────────────────────────

function ConfigTab({ agent }: { agent: Agent }) {
  const [flags, setFlags] = useState<CliFlag[]>([]);
  const [enabledFlags, setEnabledFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const agentCmdName = agent.name.toLowerCase().replace(/\s+/g, "-");

  useEffect(() => {
    let mounted = true;
    async function loadFlags() {
      if (!window.electronAPI) return;
      try {
        setLoading(true);
        const [available, enabled] = await Promise.all([
          window.electronAPI.getCliFlags(agentCmdName),
          window.electronAPI.getEnabledCliFlags(agentCmdName)
        ]);
        if (mounted) {
          setFlags(available || []);
          setEnabledFlags(enabled || {});
        }
      } catch (e) {
        console.error("Failed to load flags:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadFlags();
    return () => { mounted = false; };
  }, [agentCmdName]);

  const toggleFlag = async (flagName: string, value: boolean) => {
    if (!window.electronAPI) return;
    try {
      setEnabledFlags(prev => ({ ...prev, [flagName]: value }));
      await window.electronAPI.setEnabledCliFlag(agentCmdName, flagName, value);
    } catch (e) {
      console.error("Failed to set flag:", e);
      setEnabledFlags(prev => ({ ...prev, [flagName]: !value }));
    }
  };

  const categories = flags.reduce((acc, flag) => {
    const cat = flag.category || "Unrecognized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(flag);
    return acc;
  }, {} as Record<string, CliFlag[]>);

  return (
    <div className="max-w-3xl space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full overflow-y-auto pr-2 scrollbar-none">
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[11px] font-bold text-txt-4 uppercase tracking-wider flex items-center gap-1.5">
            <Flag className="size-3.5 text-agent-amber" />
            CLI Flags
          </h3>
          {loading && <span className="text-[10px] text-txt-4 animate-pulse">Refreshing...</span>}
        </div>
        
        {flags.length === 0 && !loading && (
          <div className="text-[13px] text-txt-3 p-6 bg-surface-2/20 rounded-xl border border-dashed border-border/50 text-center">
            No runtime flags discovered for this agent.
          </div>
        )}

        <div className="space-y-8">
          {Object.entries(categories).map(([category, catFlags]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-3">
                <h4 className="text-[12px] font-bold text-txt-2 capitalize tracking-tight">{category}</h4>
                <div className="h-[1px] flex-1 bg-border/30" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {catFlags.map((flag) => {
                  const isEnabled = !!enabledFlags[flag.name];
                  return (
                    <div key={flag.name} className={cn("group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200", isEnabled ? "bg-surface-3/50 border-primary/20 shadow-sm" : "bg-surface-2/30 border-border/30 hover:border-border/60", flag.deprecated && "opacity-50")}>
                      <div className="pt-1">
                        <Switch checked={isEnabled} onCheckedChange={(v) => toggleFlag(flag.name, v)} className="data-[state=checked]:bg-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1.5">
                          <span className={cn("font-mono text-[13px] font-semibold tracking-tight transition-colors", isEnabled ? "text-foreground" : "text-txt-2", flag.deprecated && "line-through")}>
                            {flag.name}
                          </span>
                          {flag.dangerLevel === 'high' && <Badge variant="destructive" className="h-4 px-1 text-[8px] font-bold uppercase tracking-tighter rounded-sm">Danger</Badge>}
                          {flag.dangerLevel === 'low' && <Badge variant="outline" className="h-4 px-1 text-[8px] font-bold uppercase tracking-tighter border-agent-amber/50 text-agent-amber rounded-sm">Warning</Badge>}
                          {flag.deprecated && <Badge variant="outline" className="h-4 px-1 text-[8px] font-bold uppercase tracking-tighter rounded-sm">Deprecated</Badge>}
                        </div>
                        <p className="text-[12px] text-txt-3 leading-relaxed font-medium">{flag.description}</p>
                        {flag.example && isEnabled && (
                          <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-lg bg-background/50 border border-border/20 group/example">
                            <code className="text-[11px] font-mono text-primary/80 truncate">{flag.example}</code>
                            <div className="opacity-0 group-hover/example:opacity-100 transition-opacity">
                              <CopyButton text={flag.example} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Sessions Tab ───────────────────────────────────────

function SessionsTab({ sessions, agent }: { sessions: Session[], agent: Agent }) {
  if (sessions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="size-12 rounded-2xl bg-surface-2 flex items-center justify-center border border-border shadow-inner mb-4">
          <Clock className="size-5 text-txt-4" />
        </div>
        <h3 className="text-[15px] font-medium text-foreground">No sessions yet</h3>
        <p className="text-[12px] text-txt-4 mt-1 max-w-[220px]">
          Launch {agent.name} to start your first coding session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full overflow-y-auto pr-2 scrollbar-none">
      {sessions.map((session) => (
        <Card key={session.id} className="bg-surface-2/40 border-border/30 hover:border-border/60 transition-all cursor-pointer group overflow-hidden rounded-xl">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={cn("size-9 rounded-full flex items-center justify-center shrink-0 border", session.status === "success" ? "bg-agent-green-dim border-agent-green/20 text-agent-green" : "bg-agent-red-dim border-agent-red/20 text-agent-red")}>
              {session.status === "success" ? <CheckCircle2 className="size-4.5" /> : <XCircle className="size-4.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="text-[13.5px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">{session.task}</h4>
                <span className="text-[11px] text-txt-4 font-mono ml-4 shrink-0">{session.tokens} tokens</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-txt-4">
                <span className="flex items-center gap-1.5"><MessageSquare className="size-3" />{session.turns} turns</span>
                <span className="text-border">|</span>
                <span>{session.duration}</span>
                <span className="text-border">|</span>
                <Badge variant="outline" className="px-1.5 py-0 h-4 text-[9px] uppercase border-border/60 font-medium">{session.impact} Impact</Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[10.5px] text-txt-4">{session.time}</span>
              <ArrowRight className="size-3.5 text-txt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
