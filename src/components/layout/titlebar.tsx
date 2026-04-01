"use client";

import { Search, HelpCircle, Plus, Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function Titlebar() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== "undefined" && !!window.electronAPI);
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <header className="h-10 bg-card border-b border-border flex items-center px-0 shrink-0 relative z-50 select-none">
      {/* Left: logo + name (draggable for Electron) */}
      <div className="titlebar-drag flex-1 flex items-center gap-2.5 px-4 h-full">
        <div className="size-5 bg-gradient-to-br from-primary to-purple-500 rounded flex items-center justify-center text-[10px] font-black text-black shrink-0 shadow-sm shadow-primary/20">
          B
        </div>
        <span className="text-[12px] font-bold text-foreground tracking-tight">
          Brane Hub
        </span>
      </div>

      {/* Center: global search */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 titlebar-no-drag">
        <div
          role="search"
          tabIndex={0}
          aria-label="Search agents, MCPs, configs…"
          className="w-[180px] h-6 bg-surface-3/50 border border-border/40 rounded flex items-center gap-2 px-2 cursor-text hover:border-primary/30 hover:bg-surface-3 transition-all"
        >
          <Search className="size-2.5 text-txt-3 shrink-0" />
          <span className="text-txt-3 text-[10px] flex-1 font-medium">Search…</span>
          <kbd className="font-mono text-[9px] text-txt-3 bg-background border border-border/60 rounded px-1 py-0 shadow-sm">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right: actions + window controls */}
      <div className="flex items-center h-full titlebar-no-drag">
        <div className="flex items-center gap-1.5 pr-3 border-r border-border/40 h-5">
          <button className="text-txt-3 hover:text-foreground p-1 transition-colors">
            <HelpCircle className="size-3.5" />
          </button>
        </div>
        
        {isElectron && (
          <div className="flex items-center h-full">
            <button 
              onClick={handleMinimize}
              className="h-full w-10 flex items-center justify-center text-txt-3 hover:bg-white/5 transition-colors"
            >
              <Minus className="size-3.5" />
            </button>
            <button 
              onClick={handleMaximize}
              className="h-full w-10 flex items-center justify-center text-txt-3 hover:bg-white/5 transition-colors"
            >
              <Square className="size-3" />
            </button>
            <button 
              onClick={handleClose}
              className="h-full w-10 flex items-center justify-center text-txt-3 hover:bg-agent-red hover:text-white transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
