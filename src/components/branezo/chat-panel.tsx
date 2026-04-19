"use client";

import { useRef, useEffect } from "react";
import type { ChatMessage as ChatMessageType } from "./types";
import { ChatMessageComponent } from "./chat-message";
import { PromptBar } from "./prompt-bar";
import { Bot, Coins, Hash } from "lucide-react";

// ── Chat Panel Component ──────────────────────────────

interface ChatPanelProps {
  messages: ChatMessageType[];
  onSendMessage: (content: string) => void;
  isThinking?: boolean;
  model: string;
  onModelChange: (model: string) => void;
  tokensUsed: number;
  cost: number;
  suggestions?: string[];
  sessionTitle: string;
  onStop?: () => void;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isThinking = false,
  model,
  onModelChange,
  tokensUsed,
  cost,
  suggestions = [],
  sessionTitle,
  onStop,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isThinking]);

  const formatTokens = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Session Header ─────────────────────────── */}
      <div className="shrink-0 px-5 py-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-md bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-sm shadow-primary/20">
              <Bot className="size-3.5 text-black" />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-foreground leading-tight">
                {sessionTitle || "BraneZO"}
              </h2>
              <p className="text-[10.5px] text-txt-4 mt-0.5">
                AI Coding Agent
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-txt-4">
              <Hash className="size-3" />
              <span>{formatTokens(tokensUsed)} tokens</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-txt-4">
              <Coins className="size-3" />
              <span>${cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Message Thread ─────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessageComponent key={msg.id} message={msg} />
            ))}
            {isThinking && (
              <ChatMessageComponent
                message={{
                  id: "thinking",
                  role: "assistant",
                  content: "",
                  timestamp: new Date(),
                  isThinking: true,
                }}
              />
            )}
          </>
        )}
      </div>

      {/* ── Prompt Bar ─────────────────────────────── */}
      <PromptBar
        onSend={onSendMessage}
        disabled={isThinking}
        suggestions={messages.length > 0 ? suggestions : []}
        model={model}
        onModelChange={onModelChange}
        onStop={onStop}
      />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/15 to-purple-500/10 border border-primary/15 flex items-center justify-center mb-5 shadow-lg shadow-primary/5">
        <Bot className="size-8 text-primary" />
      </div>
      <h3 className="text-[16px] font-bold text-foreground mb-2">
        Welcome to BraneZO
      </h3>
      <p className="text-[12.5px] text-txt-3 max-w-sm leading-relaxed mb-1">
        Your AI coding agent. Describe what you want to build, fix, or change
        — and BraneZO will handle the rest.
      </p>
      <p className="text-[11px] text-txt-4">
        Start by typing a message below.
      </p>
    </div>
  );
}
