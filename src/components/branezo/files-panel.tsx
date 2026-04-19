"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FileChange, FileTreeNode } from "./types";
import { FileTree } from "./file-tree";
import { DiffViewer } from "./diff-viewer";
import { GitBranch, Eye, FileStack } from "lucide-react";

// ── Files Panel Component ─────────────────────────────

interface FilesPanelProps {
  files: FileChange[];
  fileTree: FileTreeNode[];
}

export function FilesPanel({ files, fileTree }: FilesPanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"changes" | "all">("changes");

  const totalChanges = files.length;

  const handleSelectFile = (path: string) => {
    setSelectedPath(path);
    if (!openFiles.includes(path)) {
      setOpenFiles((prev) => [...prev, path]);
    }
  };

  const handleCloseFile = (path: string) => {
    setOpenFiles((prev) => prev.filter((p) => p !== path));
    if (selectedPath === path) {
      const remaining = openFiles.filter((p) => p !== path);
      setSelectedPath(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  };

  const selectedFile = files.find((f) => f.path === selectedPath) || null;
  const openFileObjects = openFiles
    .map((p) => files.find((f) => f.path === p))
    .filter(Boolean) as FileChange[];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header Tab Bar ───────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-3">
          {/* Review Tab */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-agent-green-dim text-primary text-[12px] font-semibold transition-colors">
            <Eye className="size-3.5" />
            Review
          </button>

          {/* Change Count */}
          <div className="flex items-center gap-1.5 text-[11.5px] text-txt-3">
            <GitBranch className="size-3" />
            <span className="font-semibold text-txt-2">{totalChanges}</span>
            <span>Change{totalChanges !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-surface-2/60 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("changes")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-medium transition-colors",
              viewMode === "changes"
                ? "bg-surface-3 text-foreground shadow-sm"
                : "text-txt-4 hover:text-txt-2"
            )}
          >
            <FileStack className="size-3" />
            Changes
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-medium transition-colors",
              viewMode === "all"
                ? "bg-surface-3 text-foreground shadow-sm"
                : "text-txt-4 hover:text-txt-2"
            )}
          >
            All files
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Side */}
        <div className="w-[220px] shrink-0 border-r border-border/20 overflow-hidden">
          <FileTree
            tree={fileTree}
            selectedPath={selectedPath}
            onSelectFile={handleSelectFile}
          />
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 overflow-hidden">
          <DiffViewer
            file={selectedFile}
            openFiles={openFileObjects}
            activeFilePath={selectedPath}
            onSelectFile={handleSelectFile}
            onCloseFile={handleCloseFile}
          />
        </div>
      </div>
    </div>
  );
}
