"use client";

import React from "react";
import { Folder, File as FileIcon, ChevronRight, ChevronDown } from "lucide-react";
import { useFileTreeStore } from "@/store/file-tree-store";

export const FileTreeItem = ({ item, depth = 0, onSelect }: { item: any; depth?: number; onSelect: (path: string) => void }) => {
  const { expandedFolders, toggleFolder } = useFileTreeStore();
  const isOpen = expandedFolders[item.id] || false;

  if (item.type === 'directory') {
    return (
      <div className="w-full">
        <div
          className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-muted/50 cursor-pointer text-sm text-muted-foreground transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => toggleFolder(item.id)}
        >
          {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <Folder className="size-4 text-blue-400 shrink-0" />
          <span className="truncate">{item.name}</span>
        </div>
        {isOpen && item.children?.map((child: any) => (
          <FileTreeItem key={child.id} item={child} depth={depth + 1} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-muted/50 cursor-pointer text-sm text-muted-foreground transition-colors"
      style={{ paddingLeft: `${depth * 12 + 28}px` }}
      onClick={() => onSelect(item.id)}
    >
      <FileIcon className="size-4 text-muted-foreground shrink-0" />
      <span className="truncate">{item.name}</span>
    </div>
  );
};
