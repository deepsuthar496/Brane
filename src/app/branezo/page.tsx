"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ChatPanel } from "@/components/branezo/chat-panel";
import { FilesPanel } from "@/components/branezo/files-panel";
import { cn } from "@/lib/utils";
import type { ChatMessage, FileChange, FileTreeNode } from "@/components/branezo/types";
import {
  MOCK_MESSAGES,
  MOCK_FILE_CHANGES,
  MOCK_FILE_TREE,
  SUGGESTED_PROMPTS,
} from "@/components/branezo/mock-data";
import { GripVertical } from "lucide-react";

// ── BraneZO Page ──────────────────────────────────────

export default function BraneZOPage() {
  // Session state
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [files] = useState<FileChange[]>(MOCK_FILE_CHANGES);
  const [fileTree] = useState<FileTreeNode[]>(MOCK_FILE_TREE);
  const [model, setModel] = useState("gpt-5.3-codex");
  const [isThinking, setIsThinking] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(24830);
  const [cost, setCost] = useState(0.12);

  // Resizable panels
  const [splitPercent, setSplitPercent] = useState(42);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      // Simulate AI response
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: `I'll work on that right away. Let me analyze the codebase and implement the changes.\n\nHere's what I found and what I'll do:\n1. Identified the relevant files\n2. Planning the implementation\n3. Applying changes now...`,
          timestamp: new Date(),
          toolUse: [
            {
              id: `tool-${Date.now()}`,
              toolName: "FileRead",
              input: "src/app/page.tsx",
              output: "Read file contents (170 lines)",
              status: "success",
              duration: "0.2s",
            },
            {
              id: `tool-${Date.now() + 1}`,
              toolName: "FileEdit",
              input: "src/app/page.tsx",
              output: "Applied 2 edits successfully",
              status: "success",
              duration: "0.8s",
            },
          ],
          filesChanged: ["src/app/page.tsx"],
        };

        setIsThinking(false);
        setMessages((prev) => [...prev, aiMsg]);
        setTokensUsed((prev) => prev + 3200);
        setCost((prev) => +(prev + 0.02).toFixed(2));
      }, 2500);
    },
    []
  );

  // ── Drag Resize Logic ─────────────────────────

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(28, Math.min(65, percent)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main
          ref={containerRef}
          className="flex-1 flex overflow-hidden bg-background"
        >
          {/* ── Chat Panel ─────────────────────── */}
          <div
            className="overflow-hidden flex flex-col border-r border-border/30"
            style={{ width: `${splitPercent}%` }}
          >
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isThinking={isThinking}
              model={model}
              onModelChange={setModel}
              tokensUsed={tokensUsed}
              cost={cost}
              suggestions={SUGGESTED_PROMPTS}
              sessionTitle="Dark mode toggle implementation"
            />
          </div>

          {/* ── Drag Handle ────────────────────── */}
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "w-[5px] shrink-0 cursor-col-resize flex items-center justify-center group transition-colors relative z-10",
              "hover:bg-primary/10 active:bg-primary/20"
            )}
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="size-3 text-txt-4" />
            </div>
          </div>

          {/* ── Files Panel ────────────────────── */}
          <div
            className="overflow-hidden flex flex-col"
            style={{ width: `${100 - splitPercent}%` }}
          >
            <FilesPanel files={files} fileTree={fileTree} />
          </div>
        </main>
      </div>
    </div>
  );
}
