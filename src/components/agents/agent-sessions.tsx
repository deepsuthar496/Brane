"use client";

import { cn } from "@/lib/utils";
import { 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  MessageSquare,
  ChevronRight,
  Zap,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentSessionsProps {
  agentId: string;
}

export function AgentSessions({ agentId }: AgentSessionsProps) {
  // Only show mock data for gemini-cli for now, per user request
  if (agentId !== "gemini-cli" && agentId !== "gemini") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground border border-dashed border-border/40 rounded-xl bg-surface-2/30">
        <Clock className="size-8 opacity-20 mb-4" />
        <p className="text-[13px] font-medium text-txt-3">No session history</p>
        <p className="text-[11px] text-txt-4 mt-1 max-w-xs">
          Session tracking is currently only available for the Gemini CLI agent.
        </p>
      </div>
    );
  }

  const mockSessions = [
    { 
      id: "run-a8b2x", 
      task: "Implement global command palette matching shadcn UI", 
      status: "success", 
      time: "12 mins ago", 
      duration: "4m 12s", 
      tokens: "84.2k", 
      turns: 12,
      impact: "High"
    },
    { 
      id: "run-c9f4k", 
      task: "Fix typescript error regarding item.href in app-sidebar", 
      status: "success", 
      time: "2 hours ago", 
      duration: "1m 45s", 
      tokens: "12.8k", 
      turns: 3,
      impact: "Low"
    },
    { 
      id: "run-z1d9m", 
      task: "Setup agent authentication with Supabase", 
      status: "failed", 
      time: "Yesterday", 
      duration: "8m 30s", 
      tokens: "142.5k", 
      turns: 28,
      impact: "Critical"
    },
    { 
      id: "run-q5w2p", 
      task: "Analyze memory leak in worker thread", 
      status: "success", 
      time: "2 days ago", 
      duration: "12m 05s", 
      tokens: "210.1k", 
      turns: 45,
      impact: "High"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-bold text-txt-2 tracking-widest uppercase">Recent Execution History</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[11px] font-medium border-border/40">
            Export Logs
          </Button>
        </div>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[28px] top-4 bottom-4 w-px bg-border/40" />

        <div className="space-y-4">
          {mockSessions.map((session, i) => (
            <div key={session.id} className="relative flex gap-4 group">
              {/* Timeline Node */}
              <div className="relative mt-1 shrink-0 z-10">
                <div className={cn(
                  "size-14 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105",
                  session.status === "success" 
                    ? "bg-agent-green-dim/50 border-agent-green/20 text-agent-green" 
                    : "bg-agent-red-dim/50 border-agent-red/20 text-agent-red"
                )}>
                  {session.status === "success" ? <CheckCircle2 className="size-6" /> : <XCircle className="size-6" />}
                </div>
              </div>

              {/* Session Card */}
              <div className="flex-1 bg-surface-2 border border-border/50 rounded-xl p-4 transition-all hover:bg-surface-3 hover:border-border/80 shadow-sm group-hover:shadow-md">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-txt-4 bg-background px-1.5 py-0.5 rounded border border-border/40 uppercase tracking-wider">
                        {session.id}
                      </span>
                      <span className="text-[11px] text-txt-4 font-medium flex items-center gap-1">
                        <Clock className="size-3" />
                        {session.time}
                      </span>
                    </div>
                    <h4 className="text-[14px] font-semibold text-foreground leading-snug">
                      {session.task}
                    </h4>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="shrink-0 text-txt-4 hover:text-foreground">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border/40">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-txt-4 font-semibold flex items-center gap-1">
                      <Clock className="size-3" /> Duration
                    </span>
                    <span className="text-[12px] font-mono text-txt-2">{session.duration}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-txt-4 font-semibold flex items-center gap-1">
                      <MessageSquare className="size-3" /> Turns
                    </span>
                    <span className="text-[12px] font-mono text-txt-2">{session.turns}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-txt-4 font-semibold flex items-center gap-1">
                      <Cpu className="size-3" /> Tokens
                    </span>
                    <span className="text-[12px] font-mono text-txt-2">{session.tokens}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-txt-4 font-semibold flex items-center gap-1">
                      <Zap className="size-3" /> Context
                    </span>
                    <span className="text-[12px] font-mono text-txt-2">{session.impact}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-txt-3">
                    <Terminal className="size-3" />
                    <span>Workspace:</span>
                    <span className="font-mono text-txt-4 truncate max-w-[200px]">C:\Users\Admin\Documents\projects\Branee\Brane</span>
                  </div>
                  <button className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 uppercase tracking-wider">
                    View Session <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center pt-4">
        <Button variant="outline" size="sm" className="text-xs bg-surface-2 border-border/40 hover:bg-surface-3">
          Load Older Sessions
        </Button>
      </div>
    </div>
  );
}
