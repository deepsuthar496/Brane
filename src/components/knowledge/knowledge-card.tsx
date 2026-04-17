"use client";

import { Clock, FileText, FileCode, FileJson, MoreHorizontal, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  updatedAt: string;
  extension: string;
}

interface KnowledgeCardProps {
  file: KnowledgeFile;
  onRemove: (name: string) => void;
}

export function KnowledgeCard({ file, onRemove }: KnowledgeCardProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case "md": return <FileText className="size-4 text-blue-400/80" />;
      case "json": return <FileJson className="size-4 text-agent-yellow/80" />;
      case "js":
      case "ts":
      case "tsx":
      case "py":
        return <FileCode className="size-4 text-primary/80" />;
      default: return <FileText className="size-4 text-white/40" />;
    }
  };

  return (
    <div 
      className="group relative flex flex-col p-6 bg-background hover:bg-surface-2 transition-all cursor-pointer border-r border-b border-white/5"
    >
      {/* Header: Icon + Name + Dropdown */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-lg bg-surface-3 border border-border/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-inner">
            {getFileIcon(file.extension)}
          </div>
          <h3 className="text-[16px] font-semibold text-foreground tracking-tight truncate leading-none">
            {file.name}
          </h3>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger 
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center size-7 p-0 text-txt-4 hover:text-foreground hover:bg-background/60 rounded-md transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-surface-1 border-border/60 text-txt-2 shadow-2xl p-1 rounded-xl backdrop-blur-xl">
            <DropdownMenuItem className="gap-2.5 cursor-pointer py-2 rounded-lg text-[12px] font-medium focus:bg-primary/10 focus:text-primary">
               Reveal in Finder
            </DropdownMenuItem>
            <div className="h-px bg-border/40 my-1" />
            <DropdownMenuItem 
              onClick={() => onRemove(file.name)}
              className="text-agent-red focus:text-agent-red focus:bg-agent-red/10 gap-2.5 cursor-pointer py-2 rounded-lg text-[12px] font-bold"
            >
              Unindex Source
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats/Badges */}
      <div className="flex items-center gap-2 mb-6">
        <Badge className="bg-surface-3 hover:bg-surface-3 border-border/60 text-[9px] h-4 px-1.5 text-txt-4 uppercase font-bold tracking-wider">
           {file.extension}
        </Badge>
        <span className="text-[11px] text-txt-4 font-mono font-medium">{formatSize(file.size)}</span>
      </div>

      {/* Footer: Date & Arrow */}
      <div className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-txt-4 font-medium uppercase tracking-widest">
          <Clock className="size-3 opacity-60" />
          <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
        </div>
        <ArrowRight className="size-3 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
      </div>

      {/* Top selection line for active feel */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </div>
  );
}
