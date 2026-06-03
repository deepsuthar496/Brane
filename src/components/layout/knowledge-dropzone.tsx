"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Upload,
  MoreHorizontal,
  Trash2,
  Loader2,
  BrainCircuit,
  FileUp,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
        if ((file as any).path) {
          await window.electronAPI.addKnowledgeFileFromPath((file as any).path);
        } else {
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

  const handleBrowse = async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    try {
      const result = await window.electronAPI.browseFiles({
        properties: ["openFile", "multiSelections"]
      });

      if (result.canceled) return;

      setIsUploading(true);
      for (const filePath of result.filePaths) {
        await window.electronAPI.addKnowledgeFileFromPath(filePath);
      }
      toast.success(`Added ${result.filePaths.length} knowledge source(s)`);
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
    <div className="py-6 px-4 border-t border-border mt-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-bold tracking-wider uppercase text-txt-4 flex items-center gap-2">
          <BrainCircuit className="size-3.5 text-primary/70" />
          Global Knowledge
        </div>
        {files.length > 0 && (
          <div className="text-[10px] bg-surface-3 border border-border px-1.5 py-0.5 rounded font-mono text-txt-3">
            {files.length}
          </div>
        )}
      </div>

      {/* Empty State / Dropzone Area */}
      {files.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={handleBrowse}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleBrowse();
            }
          }}
          className={cn(
            "relative group rounded-xl border border-dashed transition-all duration-300 flex flex-col items-center justify-center py-10 px-6 cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01] shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]"
              : "border-border/60 bg-muted/10 hover:border-border hover:bg-muted/20"
          )}
        >
          <div className="size-12 rounded-full bg-background border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            {isUploading ? (
              <Loader2 className="size-5 text-primary animate-spin" />
            ) : (
              <FileUp className={cn(
                "size-5 transition-colors duration-200",
                isDragging ? "text-primary" : "text-txt-3 group-hover:text-primary"
              )} />
            )}
          </div>
          
          <div className="text-[14px] font-semibold text-foreground mb-1 text-center">
            {isDragging ? "Drop to Index" : "Build your Agent's Brain"}
          </div>
          <p className="text-[12px] text-txt-3 text-center max-w-[180px] leading-relaxed mb-6">
            Drag and drop documentation here to create a shared intelligence layer.
          </p>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-4 rounded-full bg-background hover:bg-background border-border shadow-sm group-hover:border-primary/50 transition-colors"
          >
            Browse Files
          </Button>
        </div>
      ) : (
        /* Minimized Dropzone when files exist */
        <div className="space-y-4">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={handleBrowse}
            className={cn(
              "rounded-lg border border-dashed py-3 flex items-center justify-center gap-2 cursor-pointer transition-all",
              isDragging ? "border-primary bg-primary/5" : "border-border/40 hover:bg-muted/20"
            )}
          >
            <Upload className="size-3 text-txt-4" />
            <span className="text-[11px] font-medium text-txt-3">Add more sources</span>
          </div>

          <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-none pr-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 border border-transparent hover:border-border/30 transition-all"
              >
                <div className="size-8 rounded bg-muted/40 border border-border/50 flex items-center justify-center shrink-0">
                  <FileText className="size-4 text-txt-3 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-foreground/90 truncate leading-tight mb-0.5">
                    {file.name}
                  </div>
                  <div className="text-[10px] text-txt-4 font-mono uppercase tracking-tighter">
                    {file.extension} • {formatSize(file.size)}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <button className="size-7 flex items-center justify-center text-txt-4 hover:text-foreground hover:bg-muted/50 rounded-md transition-colors opacity-0 group-hover:opacity-100 outline-none">
                      <MoreHorizontal className="size-4" />
                    </button>
                  } />
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem
                      onClick={() => removeFile(file.name)}
                      className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
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
      )}
    </div>
  );
}
