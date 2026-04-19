"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ChatPanel } from "@/components/branezo/chat-panel";
import { FilesPanel } from "@/components/branezo/files-panel";
import { cn } from "@/lib/utils";
import type { ChatMessage, FileChange, FileTreeNode } from "@/components/branezo/types";
import { MOCK_FILE_CHANGES, MOCK_FILE_TREE, SUGGESTED_PROMPTS } from "@/components/branezo/mock-data";
import { GripVertical } from "lucide-react";
import { useChatStore } from "@/store/chat-store";

// ── BraneZO Page ──────────────────────────────────────

export default function BraneZOPage() {
  // Session state from Zustand
  const { 
    messages, 
    setMessages, 
    isThinking, 
    setThinking, 
    tokensUsed, 
    cost, 
    currentSessionId 
  } = useChatStore();

  const [files] = useState<FileChange[]>(MOCK_FILE_CHANGES); // Kept mocked for now until real fs watcher
  const [fileTree] = useState<FileTreeNode[]>(MOCK_FILE_TREE);
  const [model, setModel] = useState("openai:gpt-4-turbo");

  // Resizable panels
  const [splitPercent, setSplitPercent] = useState(42);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for agent streaming responses
    if (!window.electronAPI) return;

    const cleanupChunk = window.electronAPI.onBraneZOChunk(currentSessionId, (text: string) => {
      setMessages((prev) => {
        const msgs = [...prev];
        let lastMsg = msgs[msgs.length - 1];
        if (!lastMsg || lastMsg.role !== "assistant") {
          lastMsg = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: "",
            toolUse: [],
            timestamp: new Date(),
          };
          msgs.push(lastMsg);
          setThinking(false);
        }
        
        // Safe string concatenation to avoid undefined + undefined = NaN
        lastMsg.content = (lastMsg.content || "") + (text || "");
        return msgs;
      });
    });

    const cleanupToolCall = window.electronAPI.onBraneZOToolCall(currentSessionId, (call: any) => {
      setMessages((prev) => {
        const msgs = [...prev];
        let lastMsg = msgs[msgs.length - 1];
        if (!lastMsg || lastMsg.role !== "assistant") {
          lastMsg = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: "",
            toolUse: [],
            timestamp: new Date(),
          };
          msgs.push(lastMsg);
          setThinking(false);
        }
        
        lastMsg.toolUse = lastMsg.toolUse || [];
        lastMsg.toolUse.push({
          id: call.id,
          toolName: call.name,
          input: typeof call.args === "object" ? JSON.stringify(call.args) : call.args,
          status: "running"
        });
        return msgs;
      });
    });

    const cleanupToolResult = window.electronAPI.onBraneZOToolResult(currentSessionId, (res: any) => {
      setMessages((prev) => {
        const msgs = [...prev];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.toolUse) {
          const tool = lastMsg.toolUse.find(t => t.id === res.id);
          if (tool) {
            tool.status = res.result?.error ? "error" : "success";
            tool.output = res.result?.error || res.result?.title || "Completed";
          }
        }
        return msgs;
      });
    });

    const cleanupFinish = window.electronAPI.onBraneZOFinish(currentSessionId, () => {
      setThinking(false);
    });

    const cleanupError = window.electronAPI.onBraneZOError(currentSessionId, (errString: string) => {
      setThinking(false);
      setMessages((prev) => [
         ...prev,
         {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `**Error:** ${errString}\n\nPlease check your provider API key or Model endpoint settings in the ⚙️ Settings dialog.`,
            timestamp: new Date()
         }
      ]);
    });

    return () => {
      cleanupChunk();
      cleanupToolCall();
      cleanupToolResult();
      cleanupFinish();
      cleanupError();
    };
  }, [currentSessionId, setMessages, setThinking]);

  const handleSendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);

      if (window.electronAPI) {
        // Correctly split e.g. "openrouter:anthropic/claude-3-haiku" or "custom:llama3:latest"
        const firstColon = model.indexOf(":");
        const providerId = firstColon > -1 ? model.substring(0, firstColon) : "openai";
        const modelId = firstColon > -1 ? model.substring(firstColon + 1) : "gpt-4-turbo";
        
        // Using a dummy key here for the prototype until secret management is hooked up
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || "dummy_key"; 
        
        window.electronAPI.startBraneZOChat({
          id: currentSessionId,
          messages: [...messages, userMsg]
            .filter(m => m.content && m.content.trim() !== "")
            .map(m => ({
              role: m.role,
              content: m.content
            })),
          workspacePath: "C:/Users/Admin/Documents/projects/branemerge/Brane", // hardcoded temporarily
          providerId: providerId,
          modelId: modelId,
          apiKey: apiKey
        });
      } else {
        setThinking(false); // Can't send if no electron
      }
    },
    [messages, model, currentSessionId]
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
              onStop={() => {
                if (window.electronAPI) {
                  window.electronAPI.abortBraneZOChat(currentSessionId);
                }
                setThinking(false);
              }}
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
