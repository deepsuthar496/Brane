"use client";

import { Star, ArrowUpRight, Terminal } from "lucide-react";
import { SkillEntry } from "@/lib/registry";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  skill: SkillEntry;
  isInstalled: boolean;
  onClick?: (skill: SkillEntry) => void;
}

export function SkillCard({ skill, isInstalled, onClick }: SkillCardProps) {
  return (
    <div 
      className="group relative flex flex-col p-6 bg-background hover:bg-surface-2 transition-all cursor-pointer border-r border-b border-white/5"
      onClick={() => onClick?.(skill)}
    >
      {/* Header: Icon + Name + Arrow */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-lg bg-surface-3 border border-border/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 text-primary">
            <Terminal className="size-4" />
          </div>
          <h3 className="text-[16px] font-semibold text-foreground tracking-tight truncate leading-none">
            {skill.name}
          </h3>
        </div>
        <ArrowUpRight className="size-4 text-txt-4 group-hover:text-primary transition-colors shrink-0" />
      </div>

      {/* Description */}
      <p className="text-[13px] text-txt-3 leading-relaxed line-clamp-2 mb-6 min-h-[40px]">
        {skill.description}
      </p>

      {/* Footer: Category & Stats */}
      <div className="mt-auto flex items-center justify-between">
        <div className="px-2 py-0.5 rounded bg-surface-3 border border-border/60 text-[10px] text-txt-3 font-bold uppercase tracking-widest">
          {skill.tags[0] || "General"}
        </div>
        <div className="flex items-center gap-2 text-txt-4">
          <Star className="size-3.5 fill-current opacity-50" />
          <span className="text-[12px] font-medium font-mono">330k</span>
        </div>
      </div>

      {/* Top selection line for active feel */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </div>
  );
}
