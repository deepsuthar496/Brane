"use client";

import React from "react";
import { X, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";
import { ToolInvocationBlock } from "./tool-invocation-block";
import { InlinePlan } from "./inline-plan";

interface ChatMessagesProps {
  messages: any[];
  status?: string;
  error: any;
  addToolResult: (...args: any[]) => void;
  restoreToCheckpoint: (messageId: string) => void;
}

export function ChatMessages({ messages, status, error, addToolResult, restoreToCheckpoint }: ChatMessagesProps) {
  return (
    <>
      {messages.map((m, index) => {
        const msg = m as any;
        return (
          <div key={m.id} className={cn("group flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("flex flex-col gap-2 max-w-[85%]", m.role === 'user' ? "items-end" : "items-start")}>
              {/* Render standard string content only if parts are missing or empty */}
              {(!msg.parts || msg.parts.length === 0) && msg.content && (
                <div className={cn(
                  "text-sm",
                  m.role === 'user'
                    ? "bg-muted/60 text-foreground px-4 py-2.5 rounded-2xl whitespace-pre-wrap"
                    : "text-foreground py-2"
                )}>
                  {m.role === 'user' ? msg.content : <Markdown content={msg.content} />}
                </div>
              )}

              {msg.parts?.map((part: any, i: number) => {
                if (part.type === 'text') {
                  return (
                    <div key={`${m.id}-${i}`} className={cn(
                      "text-sm",
                      m.role === 'user'
                        ? "bg-muted/60 text-foreground px-4 py-2.5 rounded-2xl whitespace-pre-wrap"
                        : "text-foreground py-2"
                    )}>
                      {m.role === 'user' ? part.text : <Markdown content={part.text} />}
                    </div>
                  );
                } else if (
                  // AI SDK v6: tool parts use `tool-{toolName}` or `dynamic-tool`
                  part.type === 'dynamic-tool' || part.type?.startsWith('tool-')
                ) {
                  const tName = part.type === 'dynamic-tool' ? part.toolName : part.type?.startsWith('tool-') ? part.type.slice(5) : part.type;
                  if (tName === 'requestPlanApproval') {
                    return (
                      <InlinePlan 
                        key={part.toolCallId || `${m.id}-tool-${i}`} 
                        part={part} 
                        onApprove={() => addToolResult({ toolCallId: part.toolCallId, result: 'Plan approved. You can now edit files. Execute the plan.' })}
                        onReject={() => addToolResult({ toolCallId: part.toolCallId, result: "Plan rejected. Let's continue refining the plan." })}
                      />
                    );
                  }
                  return <ToolInvocationBlock key={part.toolCallId || `${m.id}-tool-${i}`} part={part} />;
                } else if (part.type === 'step-start') {
                  // step boundaries — render a subtle divider
                  return i > 0 ? <div key={`${m.id}-step-${i}`} className="border-t border-border/20 my-1" /> : null;
                }
                return null;
              })}
              
              {/* Files Modified badges */}
              {(() => {
                if (m.role !== 'assistant' || !m.parts) return null;
                const rawFiles = m.parts.reduce((acc: { path: string, basename: string }[], part: any) => {
                  const tName = part.type === 'dynamic-tool' ? part.toolName : part.type?.startsWith('tool-') ? part.type.slice(5) : part.type;
                  if ((tName === 'writeFile' || tName === 'editFile' || tName === 'applyPatch') && part.state === 'output-available' && !part.output?.includes('Error:') && !part.output?.includes('Failed')) {
                    if (tName === 'applyPatch') {
                      const outputStr = part.output || '';
                      const lines = outputStr.split('\n');
                      for (const line of lines) {
                        const match = line.match(/^(?:Added|Deleted|Updated|Moved)\s+(.+?)(?:\s+->\s+(.+))?$/);
                        if (match) {
                          const fPath = match[2] || match[1];
                          if (fPath) acc.push({ path: fPath, basename: fPath.split('/').pop()?.split('\\').pop() || '' });
                        }
                      }
                    } else {
                      const fPath = part.input?.path || part.input?.filePath;
                      if (fPath) acc.push({ path: fPath, basename: fPath.split('/').pop()?.split('\\').pop() || '' });
                    }
                  }
                  return acc;
                }, []);

                // Deduplicate by path — same file edited N times → shown once
                const seenPaths = new Set<string>();
                const files = rawFiles.filter((f: { path: string; basename: string }) => {
                  if (seenPaths.has(f.path)) return false;
                  seenPaths.add(f.path);
                  return true;
                });
                
                if (files.length === 0) return null;
                
                return (
                  <div className="mt-1 flex flex-col gap-2 w-full max-w-full">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      Files Modified <span className="bg-muted px-1.5 py-0.5 rounded-md text-[10px] border border-border/50">{files.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {files.map((file: { path: string; basename: string }, i: number) => {
                        const ext = file.basename.split('.').pop()?.toLowerCase() || '';
                        const isTS = ext === 'ts' || ext === 'tsx';
                        const isJS = ext === 'js' || ext === 'jsx';
                        const isCSS = ext === 'css';
                        const isHTML = ext === 'html';
                        
                        return (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 border border-border/50 rounded-md text-xs font-medium text-foreground/80 hover:bg-muted/60 transition-colors cursor-default">
                            <span className={cn(
                              "text-[10px] uppercase font-bold",
                              isTS ? "text-blue-500 dark:text-blue-400" :
                              isJS ? "text-yellow-500 dark:text-yellow-400" :
                              isCSS ? "text-cyan-500 dark:text-cyan-400" :
                              isHTML ? "text-orange-500 dark:text-orange-400" :
                              "text-muted-foreground"
                            )}>{ext}</span>
                            <span>{file.basename}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              {/* Checkpoint Revert UI for assistant messages */}
              {m.role === 'assistant' && index < messages.length - 1 && (
                <div className="mt-2 w-full">
                  <Checkpoint className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckpointIcon />
                    <CheckpointTrigger onClick={() => restoreToCheckpoint(m.id)}>
                      Restore checkpoint
                    </CheckpointTrigger>
                  </Checkpoint>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {status === 'submitted' && (
        <div className="flex gap-3 flex-row mb-2">
          <div className="flex flex-col gap-2 max-w-[85%] items-start">
            <div className="flex items-center gap-2 text-muted-foreground animate-pulse text-sm py-2">
              <Brain className="size-4" />
              <span>Thinking...</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex gap-3 flex-row">
          <div className="shrink-0 mt-1">
            <div className="size-8 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive">
              <X className="size-4" />
            </div>
          </div>
          <div className="flex flex-col gap-2 max-w-[85%] items-start">
            <div className="p-3 rounded-xl text-sm whitespace-pre-wrap bg-destructive/10 border border-destructive/20 text-destructive">
              <span className="font-semibold block mb-1">Error:</span>
              {error.message}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
