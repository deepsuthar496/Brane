"use client";

import { File as FileIcon, X, MoreHorizontal, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { CodebaseGraph } from "@/components/knowledge/codebase-graph";
import { ProblemsPanel, Problem } from "./problems-panel";

interface EditorPanelProps {
  showGraph: boolean;
  setShowGraph: (v: boolean) => void;
  selectedFile: { path: string; content: string } | null;
  setSelectedFile: (v: { path: string; content: string } | null) => void;
  isFileLoading: boolean;
  fileTree: any[];
  handleFileSelect: (path: string) => void;
  getLanguageFromPath: (path: string) => string;
  problems: Problem[];
  isScanningDiagnostics?: boolean;
  onSelectProblem?: (problem: Problem) => void;
  onClearProblems?: () => void;
  onSendToAgent?: (problems: Problem[]) => void;
}

export function EditorPanel({
  showGraph,
  setShowGraph,
  selectedFile,
  setSelectedFile,
  isFileLoading,
  fileTree,
  handleFileSelect,
  getLanguageFromPath,
  problems,
  isScanningDiagnostics,
  onSelectProblem,
  onClearProblems,
  onSendToAgent,
}: EditorPanelProps) {
  if (showGraph) {
    return (
      <div className="flex-1 w-full h-full relative">
        <div className="absolute top-4 right-4 z-10 shadow-sm rounded-md">
          <Button variant="outline" size="sm" onClick={() => setShowGraph(false)} className="bg-background/80 backdrop-blur-sm border-border">
            <X className="size-4 mr-1.5" /> Close Graph
          </Button>
        </div>
        <CodebaseGraph 
          fileTree={fileTree} 
          onNodeClick={(id, type) => {
            if (type === 'file') {
              handleFileSelect(id);
              setShowGraph(false);
            }
          }} 
        />
      </div>
    );
  }

  if (selectedFile) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* IDE-style Tab Header */}
        <div className="h-10 border-b border-border flex items-center bg-background shrink-0 px-1 gap-1">
          <div className="h-full px-4 flex items-center gap-2 border-r border-border bg-surface-2 text-[12.5px] font-bold text-foreground relative min-w-[140px] max-w-[240px] shadow-[inset_0_-2px_0_0_var(--primary)]">
            <FileIcon className="size-3.5 text-txt-3" />
            <span className="truncate">{selectedFile.path.split('/').pop() || selectedFile.path.split('\\').pop()}</span>
            <button 
              onClick={() => setSelectedFile(null)}
              className="ml-auto p-1 hover:bg-muted rounded transition-colors text-txt-4 hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
          
          {/* Tab Spacer */}
          <div className="flex-1 h-full bg-background" />
          
          {/* Actions */}
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="icon" className="size-8 text-txt-4 hover:text-foreground">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-surface-2 scrollbar-thin">
          <Markdown 
            content={`\`\`\`${getLanguageFromPath(selectedFile.path)}\n${selectedFile.content}\n\`\`\``} 
            fullBleed
          />
        </div>

        {/* Problems Panel at the bottom */}
        <ProblemsPanel 
          problems={problems} 
          isScanning={isScanningDiagnostics}
          onSelectProblem={onSelectProblem}
          onClear={onClearProblems}
          onSendToAgent={onSendToAgent}
        />
      </div>
    );
  }

  if (isFileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col text-muted-foreground bg-background h-full overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative size-16 mb-6">
          <FileIcon className="size-full opacity-5" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="size-6 opacity-20" />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-txt-3">No file selected</h3>
        <p className="text-[12px] text-txt-4 mt-1.5">Select a file from the explorer to view context</p>
      </div>

      {/* Problems Panel even when no file is selected */}
      <ProblemsPanel 
        problems={problems} 
        onSelectProblem={onSelectProblem}
        onClear={onClearProblems}
        onSendToAgent={onSendToAgent}
      />
    </div>
  );
}
