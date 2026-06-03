"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// AI SDK v6 tool part: type is `tool-{toolName}` (static) or `dynamic-tool`
// part.input = args, part.output = result, part.state = 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
export const ToolInvocationBlock = React.memo(({ part }: { part: any }) => {
  const [expanded, setExpanded] = useState(false);

  // Extract tool name: dynamic-tool has part.toolName, static has part.type like 'tool-readFile'
  const toolName: string = part.type === 'dynamic-tool'
    ? (part.toolName || 'unknown')
    : part.type.startsWith('tool-') ? part.type.slice(5) : part.type;

  const input = part.input || {};
  const output = part.output;
  const state: string = part.state || 'input-available';
  const isDone = state === 'output-available' || state === 'output-error';
  const isStreaming = state === 'input-streaming';
  const hasError = state === 'output-error';
  const isSubagent = toolName === 'spawnSubagent';

  const getToolInfo = (name: string, args: any) => {
    const filePath = args?.path || args?.filePath || '';
    switch (name) {
      case 'listDirectory': return { label: 'List', value: filePath || '.' };
      case 'getWorkspaceStructure': return { label: 'Map', value: 'Workspace Tree' };
      case 'searchCodebase': return { label: 'Search', value: args?.query || '' };
      case 'readFile': return { label: 'Read', value: filePath };
      case 'writeFile': return { label: 'Write', value: filePath };
      case 'editFile': return { label: 'Edit', value: filePath };
      case 'applyPatch': return { label: 'Patch', value: 'Multiple Files' };
      case 'useSkill': return { label: 'Skill', value: args?.name || '' };
      case 'listKnowledgeFiles': return { label: 'List Knowledge', value: 'Global Knowledge Base' };
      case 'readKnowledgeFile': return { label: 'Read Knowledge', value: args?.name || '' };
      case 'searchKnowledgeBase': return { label: 'Search Knowledge', value: args?.query || '' };
      case 'readSkillFile': return { label: 'Read Skill', value: `${args?.skillName || ''}: ${args?.filePath?.split(/[/\\]/).pop() || ''}` };
      case 'askUser': return { label: 'Ask', value: args?.question || '' };
      case 'bash': return { label: 'Bash', value: args?.command || '' };
      case 'spawnSubagent': return { label: 'Agent', value: args?.agentType || 'Task' };
      default: return { label: name, value: typeof args === 'object' ? JSON.stringify(args).slice(0, 80) : String(args || '') };
    }
  };

  const { label, value } = getToolInfo(toolName, input);

  return (
    <div className="flex flex-col my-1.5">
      <div
        className={cn(
          "flex items-center gap-2.5 text-[13px] transition-all duration-200 w-fit select-none rounded-lg px-3 py-1.5 bg-muted/40 border border-border/50",
          isDone && output ? "cursor-pointer hover:bg-muted/60" : "",
          hasError && "border-destructive/30 bg-destructive/10"
        )}
        onClick={() => isDone && output && setExpanded(!expanded)}
      >
        {isStreaming || !isDone ? (
          <span className="inline-block size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
        ) : null}

        <span className={cn(
          "font-bold",
          hasError ? "text-destructive" : "text-foreground",
          !isDone && "animate-pulse"
        )}>
          {label}
        </span>

        {value && (
          <span className={cn("text-[13px] truncate max-w-[300px]", hasError ? "text-destructive/70" : "text-muted-foreground")}>
            {value}
          </span>
        )}

        {isDone && output && (
          <ChevronDown className={cn("size-3.5 shrink-0 opacity-40 transition-transform ml-1", expanded && "rotate-180")} />
        )}
      </div>

      {/* Expanded output */}
      {expanded && isDone && output && (
        <div className="mt-1 ml-6 border-l-2 border-border/30 pl-3 text-[11px] font-mono text-muted-foreground">
          <div className="max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all py-1 pr-2 leading-relaxed">
            {typeof output === 'string'
              ? output
              : JSON.stringify(output, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
});
