"use client";

import React, { useState } from "react";
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, X, Filter, Bug, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export type ProblemType = "error" | "warning" | "info";

export interface Problem {
  id: string;
  type: ProblemType;
  message: string;
  file: string;
  line: number;
  column: number;
  source: string;
}

interface ProblemsPanelProps {
  problems: Problem[];
  isScanning?: boolean;
  onSelectProblem?: (problem: Problem) => void;
  onClear?: () => void;
  onSendToAgent?: (problems: Problem[]) => void;
}

export function ProblemsPanel({ problems, isScanning, onSelectProblem, onClear, onSendToAgent }: ProblemsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<ProblemType | "all">("all");

  const filteredProblems = problems.filter(
    (p) => filter === "all" || p.type === filter
  );

  const errorCount = problems.filter((p) => p.type === "error").length;
  const warningCount = problems.filter((p) => p.type === "warning").length;
  const infoCount = problems.filter((p) => p.type === "info").length;

  return (
    <div className={cn(
      "border-t border-border bg-background transition-all duration-300 ease-in-out flex flex-col shrink-0 overflow-hidden",
      isOpen ? "h-[300px]" : "h-10"
    )}>
      {/* Header */}
      <div 
        className="h-10 px-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors shrink-0 border-b border-transparent group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            <span className="flex items-center gap-1.5">
              <Bug className="size-3.5" />
              Problems
              {isScanning && (
                <span className="flex items-center gap-1 ml-1 text-primary animate-pulse">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="text-[9px] lowercase opacity-80">scanning...</span>
                </span>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-destructive" />
              <span className="text-[11px] font-bold">{errorCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-yellow-500" />
              <span className="text-[11px] font-bold">{warningCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold">{infoCount}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
           {problems.length > 0 && (
             <Button 
              variant="secondary" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onSendToAgent?.(problems);
              }}
              className="h-6 px-2 text-[10px] font-bold uppercase tracking-tight bg-primary/10 text-primary hover:bg-primary/20 border-none flex items-center gap-1.5"
             >
               <Send className="size-3" />
               Send all to Agent
             </Button>
           )}
           <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onClear?.();
            }}
            className="h-6 px-2 text-[10px] font-bold uppercase tracking-tight text-muted-foreground hover:text-foreground hover:bg-muted"
           >
             Dismiss all
           </Button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/5">
          {/* Toolbar */}
          <div className="h-9 px-3 border-b border-border flex items-center justify-between bg-background/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilter("all")}
                className={cn(
                  "h-7 px-3 text-[11px] font-medium transition-all", 
                  filter === "all" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilter("error")}
                className={cn(
                  "h-7 px-3 text-[11px] font-medium transition-all", 
                  filter === "error" ? "bg-destructive/10 text-destructive shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Errors
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilter("warning")}
                className={cn(
                  "h-7 px-3 text-[11px] font-medium transition-all", 
                  filter === "warning" ? "bg-yellow-500/10 text-yellow-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Warnings
              </Button>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-md border border-border/50">
               <Filter className="size-3 text-muted-foreground" />
               <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Filtered by {filter}</span>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/30">
              {filteredProblems.length > 0 ? (
                filteredProblems.map((problem) => (
                  <div 
                    key={problem.id}
                    className="px-4 py-3 flex items-start gap-3 hover:bg-muted/40 cursor-pointer transition-all group relative overflow-hidden"
                    onClick={() => onSelectProblem?.(problem)}
                  >
                    {/* Status Indicator Bar */}
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                      problem.type === "error" ? "bg-destructive" : problem.type === "warning" ? "bg-yellow-500" : "bg-blue-500"
                    )} />

                    <div className="mt-0.5 shrink-0">
                      {problem.type === "error" && (
                        <div className="size-5 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertCircle className="size-3.5 text-destructive" strokeWidth={2.5} />
                        </div>
                      )}
                      {problem.type === "warning" && (
                        <div className="size-5 rounded-full bg-yellow-500/10 flex items-center justify-center">
                          <AlertTriangle className="size-3.5 text-yellow-600" strokeWidth={2.5} />
                        </div>
                      )}
                      {problem.type === "info" && (
                        <div className="size-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Info className="size-3.5 text-blue-500" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[13px] text-foreground font-semibold tracking-tight leading-none group-hover:text-primary transition-colors">
                          {problem.message}
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendToAgent?.([problem]);
                          }}
                          className="ml-auto h-5 px-1.5 text-[9px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                        >
                          Send to Agent
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-muted-foreground font-medium truncate hover:underline hover:text-foreground transition-colors max-w-[300px]">
                          {problem.file}
                        </span>
                        <div className="flex items-center px-1.5 py-[1px] bg-background rounded border border-border/50 shadow-sm">
                          <span className="text-[10px] text-muted-foreground font-mono font-medium tracking-tight">
                            ln {problem.line}, col {problem.column}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
                  <div className="p-4 rounded-full bg-muted/10 mb-4">
                    <Bug className="size-8 opacity-20" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-widest">No diagnostics detected</p>
                  <p className="text-[10px] mt-2 opacity-60">Clean as a whistle!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
