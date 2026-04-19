"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FileTreeNode } from "./types";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Search,
  Plus,
  Minus,
  FileEdit,
} from "lucide-react";

// ── Status Colors ─────────────────────────────────────

const statusColors = {
  added: "text-agent-green",
  modified: "text-agent-amber",
  deleted: "text-agent-red",
};

const statusIcons = {
  added: Plus,
  modified: FileEdit,
  deleted: Minus,
};

// ── File Tree Item ────────────────────────────────────

interface FileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  defaultExpanded?: boolean;
}

function FileTreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultExpanded = true,
}: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isDir = node.type === "directory";
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (isDir) {
      setExpanded(!expanded);
    } else {
      onSelect(node.path);
    }
  };

  // Count changed files in dir subtree
  const countChanges = (n: FileTreeNode): number => {
    if (n.type === "file") return n.status ? 1 : 0;
    return (n.children || []).reduce((acc, c) => acc + countChanges(c), 0);
  };

  const changeCount = isDir ? countChanges(node) : 0;

  const StatusIcon = node.status ? statusIcons[node.status] : null;

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-1.5 py-[5px] pr-2 rounded-md text-left text-[12px] transition-colors group",
          isSelected
            ? "bg-sidebar-accent text-primary"
            : "text-txt-3 hover:bg-surface-2/60 hover:text-txt-2"
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {/* Chevron / Spacer */}
        {isDir ? (
          <span className="size-3.5 flex items-center justify-center shrink-0">
            {expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </span>
        ) : (
          <span className="size-3.5 shrink-0" />
        )}

        {/* Icon */}
        {isDir ? (
          expanded ? (
            <FolderOpen className="size-3.5 text-agent-amber shrink-0" />
          ) : (
            <Folder className="size-3.5 text-agent-amber shrink-0" />
          )
        ) : (
          <File
            className={cn(
              "size-3.5 shrink-0",
              node.status ? statusColors[node.status] : "text-txt-4"
            )}
          />
        )}

        {/* Name */}
        <span
          className={cn(
            "flex-1 truncate",
            node.status && !isDir ? statusColors[node.status] : ""
          )}
        >
          {node.name}
        </span>

        {/* Status indicator */}
        {StatusIcon && !isDir && (
          <StatusIcon
            className={cn(
              "size-3 shrink-0 opacity-60",
              statusColors[node.status!]
            )}
          />
        )}

        {/* Dir change count */}
        {isDir && changeCount > 0 && (
          <span className="text-[9.5px] font-mono text-primary bg-agent-green-dim px-1.5 py-px rounded-full">
            {changeCount}
          </span>
        )}
      </button>

      {/* Children */}
      {isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── File Tree Component ───────────────────────────────

interface FileTreeProps {
  tree: FileTreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTree({ tree, selectedPath, onSelectFile }: FileTreeProps) {
  const [search, setSearch] = useState("");

  // Filter tree by search
  const filterTree = (
    nodes: FileTreeNode[],
    query: string
  ): FileTreeNode[] => {
    if (!query) return nodes;
    return nodes.reduce<FileTreeNode[]>((acc, node) => {
      if (node.type === "file") {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          acc.push(node);
        }
      } else {
        const filteredChildren = filterTree(node.children || [], query);
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const filteredTree = filterTree(tree, search);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2.5 pt-2.5 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-txt-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code"
            className="w-full bg-surface-2/60 border border-border/30 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-foreground placeholder:text-txt-4 outline-none focus:border-primary/30 transition-colors"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {filteredTree.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-txt-4">
            No matching files
          </div>
        ) : (
          filteredTree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
