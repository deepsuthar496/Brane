"use client";

import { useState } from "react";
import { 
  MoreHorizontal, 
  Edit2, 
  Check, 
  X,
  Database,
  HardDrive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
  collection?: string;
  description?: string;
}

interface KnowledgeCardProps {
  file: KnowledgeFile;
  onRemove: (name: string, collection?: string) => void;
  onReveal?: (name: string, collection?: string) => void;
  onUpdateDescription?: (id: string, description: string) => void;
}

export function KnowledgeCard({ file, onRemove, onReveal, onUpdateDescription }: KnowledgeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [desc, setDesc] = useState(file.description || "");

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleSave = () => {
    onUpdateDescription?.(file.id, desc);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDesc(file.description || "");
    setIsEditing(false);
  };

  const collectionInitial = (file.collection || "General").substring(0, 2).toUpperCase();

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border/40 bg-surface-2/30 p-5 shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-surface-2/50 cursor-default min-h-[190px]">
      
      <div>
        {/* Top Row: File Type & Actions */}
        <div className="flex items-center justify-between mb-4">
          <span className="flex h-6 items-center rounded bg-surface-3/80 px-2.5 text-[10px] font-bold tracking-[0.15em] text-txt-3 uppercase border border-border/40 select-none">
            {file.extension}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center size-6 p-0 text-txt-4 hover:text-foreground hover:bg-surface-3 rounded-md transition-all shrink-0"
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-popover border-border/60 shadow-2xl p-1.5 rounded-xl backdrop-blur-xl">
              <DropdownMenuItem 
                onClick={() => onReveal?.(file.name, file.collection)}
                className="gap-3 cursor-pointer py-2.5 rounded-lg text-[13px] font-medium focus:bg-primary/10 focus:text-primary"
              >
                <Database className="size-4 opacity-70" />
                Reveal in Explorer
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsEditing(true)}
                className="gap-3 cursor-pointer py-2.5 rounded-lg text-[13px] font-medium focus:bg-primary/10 focus:text-primary"
              >
                <Edit2 className="size-4 opacity-70" />
                Edit Description
              </DropdownMenuItem>
              <div className="h-px bg-border/40 my-1.5" />
              <DropdownMenuItem
                onClick={() => onRemove(file.name, file.collection)}
                className="text-agent-red focus:text-agent-red focus:bg-agent-red/10 gap-3 cursor-pointer py-2.5 rounded-lg text-[13px] font-bold"
              >
                <X className="size-4 opacity-70" />
                Unindex Node
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* File Name */}
        <h3 className="truncate text-[15.5px] font-bold text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
          {file.name}
        </h3>
        
        {/* AI Snippet / Context */}
        <div className="mt-2 flex-1 overflow-hidden">
          {isEditing ? (
            <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What is this file for?"
                className="w-full bg-surface-2 border border-border/60 rounded-lg p-2.5 text-[11px] min-h-[70px] focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none font-medium leading-relaxed"
                autoFocus
              />
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleCancel}>Cancel</Button>
                <Button size="sm" className="h-6 px-3 text-[10px]" onClick={handleSave}>Save</Button>
              </div>
            </div>
          ) : (
            <p className={cn(
              "text-[13px] leading-relaxed line-clamp-2",
              file.description ? "text-txt-3 font-normal" : "text-txt-4/60 italic"
            )}>
              {file.description || "No AI description provided for this node."}
            </p>
          )}
        </div>
      </div>

      {/* Footer: Inline Metadata (Perfected Alignment) */}
      <div className="mt-6 pt-4 flex items-center justify-between border-t border-border/20 text-[11px] text-txt-4 font-semibold">
        {/* Collection Badge (Avatar Style) */}
        <div className="flex items-center shrink-0">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 border border-border/60 text-[9px] font-bold text-primary shadow-sm select-none">
            {collectionInitial}
          </span>
        </div>
        
        {/* Specs (Right Aligned, Single Line) */}
        <div className="flex items-center gap-1.5 font-mono opacity-80 whitespace-nowrap overflow-hidden">
          <HardDrive className="size-3.5 opacity-50 shrink-0" />
          <span className="shrink-0">{formatSize(file.size)}</span>
        </div>
      </div>

      {/* Decorative top selection line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    </div>
  );
}
