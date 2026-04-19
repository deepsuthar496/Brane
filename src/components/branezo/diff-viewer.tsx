"use client";

import { cn } from "@/lib/utils";
import type { FileChange, DiffLine } from "./types";
import {
  X,
  Copy,
  Download,
  FileText,
  Plus,
  Minus,
  FileEdit,
} from "lucide-react";
import { useState } from "react";

// ── Line Component ────────────────────────────────────

function DiffLineRow({ line }: { line: DiffLine }) {
  const bgClass =
    line.type === "add"
      ? "bg-diff-add"
      : line.type === "remove"
      ? "bg-diff-remove"
      : "";

  const textClass =
    line.type === "add"
      ? "text-diff-add-text"
      : line.type === "remove"
      ? "text-diff-remove-text"
      : "text-txt-3";

  const prefix =
    line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";

  return (
    <div
      className={cn(
        "flex items-stretch text-[12px] font-mono leading-[1.7] hover:brightness-110 transition-all",
        bgClass
      )}
    >
      {/* Line number */}
      <div className="w-12 shrink-0 text-right pr-3 select-none text-txt-4/50 text-[11px]">
        {line.lineNumber}
      </div>

      {/* Prefix */}
      <div
        className={cn(
          "w-5 shrink-0 text-center select-none font-bold",
          textClass
        )}
      >
        {prefix}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pr-4 whitespace-pre", textClass)}>
        {line.content || " "}
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────

function FileStatusBadge({ status }: { status: string }) {
  const config = {
    added: {
      bg: "bg-agent-green-dim",
      text: "text-agent-green",
      icon: Plus,
      label: "Added",
    },
    modified: {
      bg: "bg-agent-amber-dim",
      text: "text-agent-amber",
      icon: FileEdit,
      label: "Modified",
    },
    deleted: {
      bg: "bg-agent-red-dim",
      text: "text-agent-red",
      icon: Minus,
      label: "Deleted",
    },
  }[status] || {
    bg: "bg-surface-2",
    text: "text-txt-3",
    icon: FileText,
    label: status,
  };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
        config.bg,
        config.text
      )}
    >
      <Icon className="size-2.5" />
      {config.label}
    </span>
  );
}

// ── Diff Viewer Component ─────────────────────────────

interface DiffViewerProps {
  file: FileChange | null;
  openFiles: FileChange[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
}

export function DiffViewer({
  file,
  openFiles,
  activeFilePath,
  onSelectFile,
  onCloseFile,
}: DiffViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!file) return;
    const content = file.diff.map((l) => l.content).join("\n");
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="size-12 rounded-xl bg-surface-2 border border-border/40 flex items-center justify-center mb-3">
          <FileText className="size-5 text-txt-4" />
        </div>
        <p className="text-[13px] font-medium text-txt-3">No changes</p>
        <p className="text-[11px] text-txt-4 mt-1">
          No changes in this session yet
        </p>
      </div>
    );
  }

  const addCount = file.diff.filter((l) => l.type === "add").length;
  const removeCount = file.diff.filter((l) => l.type === "remove").length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Tab Bar ─────────────────────────────── */}
      <div className="shrink-0 flex items-center border-b border-border/30 bg-card overflow-x-auto scrollbar-none">
        {openFiles.map((f) => {
          const fname = f.path.split("/").pop()!;
          const isActive = f.path === activeFilePath;
          return (
            <div
              key={f.path}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[11.5px] border-r border-border/20 cursor-pointer transition-colors group shrink-0",
                isActive
                  ? "bg-background text-foreground border-b-2 border-b-primary"
                  : "text-txt-4 hover:text-txt-2 hover:bg-surface-2/30"
              )}
              onClick={() => onSelectFile(f.path)}
            >
              <FileText className="size-3 shrink-0" />
              <span className="truncate max-w-32">{fname}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseFile(f.path);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity p-0.5 rounded"
              >
                <X className="size-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── File Info Bar ───────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border/20 bg-card">
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-mono text-txt-2 truncate">
            {file.path}
          </span>
          <FileStatusBadge status={file.status} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-agent-green">
            +{addCount}
          </span>
          <span className="text-[10px] font-mono text-agent-red">
            −{removeCount}
          </span>
          <div className="h-3 w-px bg-border/30 mx-1" />
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-surface-3 text-txt-4 hover:text-txt-2 transition-colors"
            title="Copy content"
          >
            <Copy className="size-3" />
          </button>
          <button className="p-1 rounded hover:bg-surface-3 text-txt-4 hover:text-txt-2 transition-colors" title="Download">
            <Download className="size-3" />
          </button>
        </div>
      </div>

      {/* ── Diff Content ────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="py-1">
          {file.diff.map((line, i) => (
            <DiffLineRow key={i} line={line} />
          ))}
        </div>
      </div>
    </div>
  );
}
