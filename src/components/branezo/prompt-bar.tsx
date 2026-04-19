"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import {
  Send,
  Plus,
  ChevronDown,
  Sparkles,
  Shield,
} from "lucide-react";

// ── Model Options ─────────────────────────────────────

const MODELS = [
  { id: "gpt-5.3-codex", label: "GPT-5.3-Codex", badge: null },
  { id: "claude-opus-4.6", label: "Claude Opus 4.6", badge: "Thinking" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", badge: null },
  { id: "deepseek-r3", label: "DeepSeek R3", badge: "Budget" },
];

// ── Prompt Bar Component ──────────────────────────────

interface PromptBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  suggestions?: string[];
  model: string;
  onModelChange: (model: string) => void;
}

export function PromptBar({
  onSend,
  disabled = false,
  suggestions = [],
  model,
  onModelChange,
}: PromptBarProps) {
  const [value, setValue] = useState("");
  const [showModels, setShowModels] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelsRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [value]);

  // Close model picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelsRef.current && !modelsRef.current.contains(e.target as Node)) {
        setShowModels(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentModel = MODELS.find((m) => m.id === model) || MODELS[0];

  return (
    <div className="shrink-0 px-5 pb-4 pt-2">
      {/* Suggestion Chips */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border/40 bg-surface-2/40 text-txt-3 hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Container — clean floating style like reference */}
      <div className="rounded-xl border border-border/50 bg-card focus-within:border-border transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[13px] text-foreground placeholder:text-txt-4 outline-none",
            "scrollbar-none leading-relaxed"
          )}
        />

        {/* Inner toolbar — attach + send */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          {/* Left: attach button */}
          <button className="size-7 rounded-lg flex items-center justify-center text-txt-4 hover:text-txt-2 hover:bg-muted transition-colors">
            <Plus className="size-4" />
          </button>

          {/* Right: send */}
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              "size-7 rounded-lg flex items-center justify-center transition-all",
              value.trim() && !disabled
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
                : "bg-muted text-txt-4 cursor-not-allowed"
            )}
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom bar — matches reference: Build, Model, Default, shield */}
      <div className="flex items-center gap-2 mt-2 px-1">
        {/* Build mode */}
        <button className="flex items-center gap-1 text-[11px] text-txt-3 hover:text-foreground transition-colors">
          Build
          <ChevronDown className="size-3" />
        </button>

        <span className="text-border">·</span>

        {/* Model Selector */}
        <div className="relative" ref={modelsRef}>
          <button
            onClick={() => setShowModels(!showModels)}
            className="flex items-center gap-1 text-[11px] text-txt-3 hover:text-foreground transition-colors"
          >
            <Sparkles className="size-3 text-primary opacity-70" />
            {currentModel.label}
            <ChevronDown className="size-3" />
          </button>

          {showModels && (
            <div className="absolute bottom-full mb-2 left-0 w-56 rounded-xl border border-border/50 bg-popover shadow-xl shadow-black/40 py-1.5 z-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onModelChange(m.id);
                    setShowModels(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-[12px] hover:bg-muted transition-colors text-left",
                    m.id === model ? "text-primary" : "text-txt-2"
                  )}
                >
                  <Sparkles className="size-3 shrink-0" />
                  <span className="flex-1">{m.label}</span>
                  {m.badge && (
                    <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-agent-green-dim text-primary">
                      {m.badge}
                    </span>
                  )}
                  {m.id === model && (
                    <span className="size-1.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-border">·</span>

        {/* Default mode */}
        <button className="flex items-center gap-1 text-[11px] text-txt-3 hover:text-foreground transition-colors">
          Default
          <ChevronDown className="size-3" />
        </button>

        <span className="text-border">·</span>

        {/* Shield icon */}
        <button className="text-txt-4 hover:text-txt-2 transition-colors">
          <Shield className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
