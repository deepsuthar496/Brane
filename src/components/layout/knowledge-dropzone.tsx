"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  FileText, 
  Upload, 
  MoreHorizontal, 
  Trash2, 
  Loader2,
  BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  updatedAt: string;
  extension: string;
}

export function KnowledgeDropzone() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    try {
      const list = await window.electronAPI.listKnowledgeFiles();
      setFiles(list);
    } catch (error) {
      console.error("Failed to load knowledge files:", error);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of droppedFiles) {
        // In a real Electron app, we'd get the path. 
        // For web-based testing or strict sandboxing, we'd use buffer.
        // electronAPI.addKnowledgeFileFromPath is preferred for professional desktop feel.
        if ((file as any).path) {
          await window.electronAPI.addKnowledgeFileFromPath((file as any).path);
        } else {
          // Fallback if path is not available (browser context)
          const text = await file.text();
          await window.electronAPI.addKnowledgeFile(file.name, text);
        }
      }
      toast.success(`Added ${droppedFiles.length} knowledge source(s)`);
      loadFiles();
    } catch (error) {
      toast.error("Failed to add files");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = async (name: string) => {
    try {
      await window.electronAPI.removeKnowledgeFile(name);
      toast.success("Knowledge source removed");
      loadFiles();
    } catch (error) {
      toast.error("Failed to remove file");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="py-4 px-2 border-t border-border mt-auto">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="text-[10.5px] font-semibold tracking-wide uppercase text-txt-3 flex items-center gap-1.5">
          <BrainCircuit className="size-3 text-primary/80" />
          Global Knowledge
        </div>
        <div className="text-[10px] text-white/20 font-mono">{files.length}</div>
      </div>

      {/* Dropzone Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative group mx-1.5 mb-3 rounded-lg border border-dashed transition-all duration-200 flex flex-col items-center justify-center py-4 px-3 cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
        )}
      >
        {isUploading ? (
          <Loader2 className="size-5 text-primary/60 animate-spin" />
        ) : (
          <Upload className={cn(
            "size-5 transition-colors duration-200",
            isDragging ? "text-primary" : "text-white/20 group-hover:text-white/40"
          )} />
        )}
        <div className="text-[11px] text-white/30 group-hover:text-white/50 mt-1.5 text-center font-medium">
          {isDragging ? "Drop to Index" : "Drop context here"}
        </div>
        <div className="text-[9px] text-white/10 mt-px">Share with all agents</div>
      </div>

      {/* File List */}
      <div className="space-y-1 max-h-[160px] overflow-y-auto scrollbar-none px-1">
        {files.map((file) => (
          <div 
            key={file.id}
            className="group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors"
          >
            <div className="size-6 rounded bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
              <FileText className="size-3 text-white/30 group-hover:text-white/50 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white/70 truncate group-hover:text-white transition-colors leading-tight">
                {file.name}
              </div>
              <div className="text-[9px] text-white/20 font-mono uppercase tracking-tighter">
                {file.extension} • {formatSize(file.size)}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="size-6 flex items-center justify-center text-white/10 hover:text-white/40 rounded transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-[#1a1a1a] border-white/10 text-white/70">
                <DropdownMenuItem 
                  onClick={() => removeFile(file.name)}
                  className="text-agent-red focus:text-agent-red focus:bg-agent-red/10 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
