"use client";

import { useState } from "react";
import { Check, Loader2, Globe, Terminal, ArrowUpRight } from "lucide-react";
import { McpEntry } from "@/lib/registry";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface McpCardProps {
  mcp: McpEntry;
  isInstalled: boolean;
  onInstall?: (mcp: McpEntry) => Promise<void>;
}

export function McpCard({ mcp, isInstalled, onInstall }: McpCardProps) {
  const [installing, setInstalling] = useState(false);
  const isUrl = !!mcp.url;

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstalled || installing || !onInstall) return;

    setInstalling(true);
    try {
      await onInstall(mcp);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      className="group relative flex flex-col p-6 bg-background hover:bg-surface-2/30 transition-all border-r border-b border-white/5"
    >
      {/* Header: Icon + Name + Arrow/Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-lg bg-surface-3 border border-border/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            {isUrl ? <Globe className="size-4 text-agent-blue" /> : <Terminal className="size-4 text-agent-purple" />}
          </div>
          <h3 className="text-[16px] font-semibold text-foreground tracking-tight truncate leading-none">
            {mcp.name}
          </h3>
        </div>
        
        <div className="shrink-0">
           {isInstalled ? (
              <div className="flex items-center gap-1 text-[9px] font-black text-agent-green uppercase tracking-tighter bg-agent-green/10 px-1.5 py-0.5 rounded ring-1 ring-agent-green/20 shadow-sm">
                <Check className="size-2.5" />
                <span>Installed</span>
              </div>
           ) : (
              <div className="relative flex items-center justify-end w-14 h-7">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleInstall}
                  disabled={installing}
                  className="h-7 px-3 text-[10px] font-black uppercase tracking-wider rounded-full opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg shadow-primary/20 absolute right-0 z-10"
                >
                  {installing ? <Loader2 className="size-3 animate-spin" /> : "Install"}
                </Button>
                <ArrowUpRight className="size-4 text-txt-4 group-hover:opacity-0 transition-all duration-200" />
              </div>
           )}
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] text-txt-3 leading-relaxed line-clamp-2 mb-6 min-h-[40px]">
        {mcp.description}
      </p>

      {/* Footer: Category & Scope */}
      <div className="mt-auto flex items-center justify-between">
        <div className="px-2 py-0.5 rounded bg-surface-3 border border-border/60 text-[10px] text-txt-3 font-bold uppercase tracking-widest">
          {mcp.category}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-txt-4 uppercase opacity-70">
            {isUrl ? "Network" : "Local"}
          </span>
        </div>
      </div>

      {/* Top selection line for active feel */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </div>
  );
}
