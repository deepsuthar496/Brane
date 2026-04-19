"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, ToolUseBlock } from "./types";
import {
  FileEdit,
  Terminal,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Bot,
  User,
} from "lucide-react";

// ── Tool Icon Map ─────────────────────────────────────

const toolIconMap: Record<string, typeof FileEdit> = {
  FileRead: FileText,
  FileWrite: FileEdit,
  FileEdit: FileEdit,
  Bash: Terminal,
  Search: Search,
  GrepTool: Search,
  GlobTool: Search,
};

// ── Tool Use Card ─────────────────────────────────────

function ToolUseCard({ tool }: { tool: ToolUseBlock }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = toolIconMap[tool.toolName] || Terminal;

  const statusColor =
    tool.status === "success"
      ? "text-agent-green"
      : tool.status === "error"
      ? "text-agent-red"
      : "text-agent-amber";

  const StatusIcon =
    tool.status === "success"
      ? CheckCircle2
      : tool.status === "error"
      ? XCircle
      : Loader2;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left rounded-lg border border-border/30 bg-surface-2/40 hover:border-border/50 transition-all group"
    >
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="size-6 rounded-md bg-surface-3 border border-border/30 flex items-center justify-center shrink-0">
          <Icon className="size-3 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11.5px] font-semibold text-txt-2">
            {tool.toolName}
          </span>
          <span className="text-[11px] text-txt-4 ml-2 font-mono truncate">
            {tool.input}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tool.duration && (
            <span className="text-[10px] text-txt-4 font-mono">
              {tool.duration}
            </span>
          )}
          <StatusIcon
            className={cn(
              "size-3.5",
              statusColor,
              tool.status === "running" && "animate-spin"
            )}
          />
          {expanded ? (
            <ChevronDown className="size-3 text-txt-4" />
          ) : (
            <ChevronRight className="size-3 text-txt-4" />
          )}
        </div>
      </div>

      {expanded && tool.output && (
        <div className="px-3 pb-2.5 pt-0">
          <div className="rounded-md bg-background border border-border/20 px-3 py-2 font-mono text-[11px] text-txt-3 leading-relaxed whitespace-pre-wrap">
            {tool.output}
          </div>
        </div>
      )}
    </button>
  );
}

// ── Inline Code Block ─────────────────────────────────

function InlineCode({ children }: { children: string }) {
  return (
    <code className="px-1.5 py-0.5 rounded-[4px] bg-surface-3 border border-border/30 text-[11.5px] font-mono text-primary">
      {children}
    </code>
  );
}

// ── Markdown-ish Renderer ─────────────────────────────

function renderContent(content: string) {
  const parts = content.split(/(`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <InlineCode key={i}>{part.slice(1, -1)}</InlineCode>;
    }

    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith("**") && bp.endsWith("**")) {
        return (
          <strong key={`${i}-${j}`} className="font-semibold text-foreground">
            {bp.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${i}-${j}`}>{bp}</span>;
    });
  });
}

// ── Copy Button ───────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-txt-4 hover:text-txt-2"
      title="Copy message"
    >
      {copied ? (
        <Check className="size-3 text-agent-green" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  );
}

// ── Thinking Indicator ────────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex gap-1">
        <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-[11px] text-txt-3 italic">Thinking...</span>
    </div>
  );
}

// ── Main Message Component ────────────────────────────

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessageComponent({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const timeStr = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.isThinking) {
    return (
      <div className="flex gap-3 px-5 py-1.5 animate-in fade-in-0 duration-300">
        <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-primary/20">
          <Bot className="size-3.5 text-black" />
        </div>
        <ThinkingIndicator />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 px-5 py-2.5 group animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="size-7 rounded-lg bg-surface-3 border border-border/40 flex items-center justify-center shrink-0 mt-0.5">
          <User className="size-3.5 text-txt-2" />
        </div>
      ) : (
        <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-primary/20">
          <Bot className="size-3.5 text-black" />
        </div>
      )}

      {/* Message Body */}
      <div
        className={cn("flex-1 min-w-0", isUser ? "flex flex-col items-end" : "")}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 mb-1.5",
            isUser ? "flex-row-reverse" : ""
          )}
        >
          <span className="text-[11.5px] font-semibold text-txt-2">
            {isUser ? "You" : "BraneZO"}
          </span>
          <span className="text-[10px] text-txt-4 font-mono">{timeStr}</span>
          <CopyBtn text={message.content} />
        </div>

        {/* Content Bubble */}
        <div
          className={cn(
            "rounded-xl px-4 py-3 max-w-[95%]",
            isUser
              ? "bg-surface-3 border border-border/20 rounded-tr-sm"
              : "bg-surface-2/60 border border-border/15 rounded-tl-sm"
          )}
        >
          {/* Text */}
          <div className="text-[13px] leading-[1.7] text-txt-1 whitespace-pre-wrap">
            {renderContent(message.content)}
          </div>

          {/* Tool Use Blocks */}
          {message.toolUse && message.toolUse.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {message.toolUse.map((tool) => (
                <ToolUseCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}

          {/* Files Changed Indicator */}
          {message.filesChanged && message.filesChanged.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[10.5px] text-primary font-medium">
              <FileEdit className="size-3" />
              <span>
                {message.filesChanged.length} file
                {message.filesChanged.length > 1 ? "s" : ""} changed
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
