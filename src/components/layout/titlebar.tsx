"use client";

import { Search, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Titlebar() {
  return (
    <header className="h-12 bg-card border-b border-border flex items-center px-0 shrink-0 relative z-50">
      {/* Left: logo + name (draggable for Electron) */}
      <div className="titlebar-drag flex-1 flex items-center gap-2.5 px-4 h-full select-none">
        <div className="size-[22px] bg-gradient-to-br from-primary to-purple-400 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0">
          A
        </div>
        <span className="text-[13px] font-semibold text-foreground tracking-tight">
          AgentHub
        </span>
      </div>

      {/* Center: global search */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 titlebar-no-drag">
        <div
          role="search"
          tabIndex={0}
          aria-label="Search agents, MCPs, configs…"
          className="w-[220px] h-7 bg-muted border border-border rounded-md flex items-center gap-2 px-2.5 cursor-text hover:border-input transition-colors"
        >
          <Search className="size-3 opacity-35 shrink-0" />
          <span className="text-txt-3 text-xs flex-1">Search everything…</span>
          <kbd className="font-mono text-[10px] text-txt-3 bg-surface-2 border border-border rounded px-1.5 py-px">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 pr-4 titlebar-no-drag">
        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1.5">
          <HelpCircle className="size-[13px]" />
          Docs
        </Button>
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1.5">
          <Plus className="size-[13px]" />
          Add Agent
        </Button>
      </div>
    </header>
  );
}
