"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import { ChatPanel } from "@/components/branezo/chat-panel";
import { FilesPanel } from "@/components/branezo/files-panel";
import { AppSidebar } from "@/components/app-sidebar";
import { Titlebar } from "@/components/titlebar";
import { cn } from "@/lib/utils";
import { Bot, FolderOpen, GripVertical } from "lucide-react";
import type { ChatMessage, FileTreeNode, FileChange } from "@/components/branezo/types";

// ── BraneZO Page ──────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "Build a simple login page with Tailwind",
  "Explain how the auth system works",
  "Refactor the UserProfile component",
  "Add unit tests for the math utilities",
];

export default function BraneZOPage() {
  const {
    messages,
    isThinking,
    tokensUsed,
    cost,
    currentSessionId,
    workspacePath,
    setMessages,
    setThinking,
    clearMessages,
    setWorkspacePath,
  } = useChatStore();

  const [files, setFiles] = useState<FileChange[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [splitPercent, setSplitPercent] = useState(38);
  const [model, setModel] = useState("openai:gpt-4-turbo");

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // ── Handlers ─────────────────────────────────────

  const handleSelectWorkspace = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.browseFiles({
      properties: ["openDirectory"],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      setWorkspacePath(result.filePaths[0]);
    }
  };

  useEffect(() => {
    if (workspacePath && window.electronAPI) {
      window.electronAPI.readBraneZOFileTree(workspacePath).then(setFileTree);
    }
  }, [workspacePath]);

  useEffect(() => {
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
        // Look for the tool call in any assistant message (usually the last one)
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (msg.role === "assistant" && msg.toolUse) {
            const tool = msg.toolUse.find(t => t.id === res.id);
            if (tool) {
              const isError = res.result && (res.result.error !== undefined || res.result.isError === true);
              tool.status = isError ? "error" : "success";
              tool.output = res.result?.error || res.result?.stdout || res.result?.results || JSON.stringify(res.result);
              break;
            }
          }
        }
        return msgs;
      });
    });

    const cleanupFinish = window.electronAPI.onBraneZOFinish(currentSessionId, (canonicalMessages: any[]) => {
      setThinking(false);
      
      setMessages((prev) => {
        const synced = [...prev];
        let lastUserIdxUI = -1;
        for (let i = synced.length - 1; i >= 0; i--) {
           if (synced[i].role === "user") {
              lastUserIdxUI = i;
              break;
           }
        }
        if (lastUserIdxUI === -1) return synced;

        let lastUserIdxCanonical = -1;
        for (let i = canonicalMessages.length - 1; i >= 0; i--) {
           if (canonicalMessages[i].role === "user") {
              lastUserIdxCanonical = i;
              break;
           }
        }

        const newMessagesFromAgent = lastUserIdxCanonical >= 0
           ? canonicalMessages.slice(lastUserIdxCanonical + 1) 
           : canonicalMessages;

        const turnResults: ChatMessage[] = [];
        let currentAssistant: ChatMessage | null = null;

        for (const m of newMessagesFromAgent) {
           const role = (m.role === "model" || m.role === "assistant") ? "assistant" : m.role;
           
           if (role === "assistant") {
              currentAssistant = {
                 id: `msg-fin-${Date.now()}-${turnResults.length}`,
                 role: "assistant",
                 content: "",
                 toolUse: [],
                 timestamp: new Date()
              };
              
              if (typeof m.content === "string") {
                 currentAssistant.content = m.content;
              } else if (Array.isArray(m.content)) {
                 for (const part of m.content) {
                    if (part.type === "text") currentAssistant.content += part.text;
                    if (part.type === "tool-call") {
                       currentAssistant.toolUse?.push({
                          id: part.toolCallId,
                          toolName: part.toolName,
                          input: typeof part.args === "string" ? part.args : JSON.stringify(part.args),
                          status: "success"
                       });
                    }
                 }
              }
              turnResults.push(currentAssistant);
           } else if (role === "tool") {
              if (currentAssistant && Array.isArray(m.content)) {
                 for (const part of m.content) {
                    const tc = currentAssistant.toolUse?.find((t: any) => t.id === part.toolCallId);
                    if (tc) {
                       tc.output = typeof part.result === "string" ? part.result : JSON.stringify(part.result);
                       tc.status = part.isError ? "error" : "success";
                    }
                 }
              }
           }
        }

        if (turnResults.length > 0) {
           synced.splice(lastUserIdxUI + 1, synced.length - (lastUserIdxUI + 1), ...turnResults);
        }
        return synced;
      });
    });

    const cleanupError = window.electronAPI.onBraneZOError(currentSessionId, (errString: string) => {
      setThinking(false);
      setMessages((prev) => [
         ...prev,
         {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `**Error:** ${errString}\n\nPlease check your provider settings or API keys.`,
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
      if (!workspacePath) return;

      const trimmedContent = content.trim();
      if (trimmedContent === "/clear" || trimmedContent === "/reset") {
         clearMessages();
         if (window.electronAPI) window.electronAPI.abortBraneZOChat(currentSessionId);
         return;
      }
      
      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);

      if (window.electronAPI) {
        const firstColon = model.indexOf(":");
        const providerId = firstColon > -1 ? model.substring(0, firstColon) : "openai";
        const modelId = firstColon > -1 ? model.substring(firstColon + 1) : "gpt-4-turbo";
        
        window.electronAPI.startBraneZOChat({
          id: currentSessionId,
          messages: [...messages, userMsg].filter(m => m.role === "user" ? (m.content && m.content.trim() !== "") : true),
          workspacePath: workspacePath,
          providerId: providerId,
          modelId: modelId,
          apiKey: "dummy_key"
        });
      }
    },
    [messages, model, currentSessionId, workspacePath, clearMessages, setMessages, setThinking]
  );

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
      setSplitPercent(Math.max(20, Math.min(80, percent)));
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
        <main ref={containerRef} className="flex-1 flex overflow-hidden bg-background">
          {!workspacePath ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center bg-surface-2/20">
               <div className="flex flex-col items-center max-w-sm">
                  <div className="size-20 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center mb-6 shadow-xl shadow-primary/5">
                     <Bot className="size-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-3">Welcome to BraneZO</h2>
                  <p className="text-sm text-txt-3 mb-8 leading-relaxed">
                     Your autonomous coding agent is ready. Select a folder to get started.
                  </p>
                  <button
                     onClick={handleSelectWorkspace}
                     className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                  >
                     <FolderOpen className="size-4" />
                     Select Workspace Folder
                  </button>
               </div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden flex flex-col border-r border-border/30" style={{ width: `${splitPercent}%` }}>
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isThinking={isThinking}
                  onStop={() => {
                    if (window.electronAPI) window.electronAPI.abortBraneZOChat(currentSessionId);
                    setThinking(false);
                  }}
                  model={model}
                  onModelChange={setModel}
                  tokensUsed={tokensUsed}
                  cost={cost}
                  suggestions={SUGGESTED_PROMPTS}
                  sessionTitle={workspacePath.split(/[/\\]/).pop() || "BraneZO"}
                  fileTree={fileTree}
                />
              </div>
              <div onMouseDown={handleMouseDown} className="w-[5px] shrink-0 cursor-col-resize flex items-center justify-center group transition-colors relative z-10 hover:bg-primary/10 active:bg-primary/20">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="size-3 text-txt-4" />
                </div>
              </div>
              <div className="overflow-hidden flex flex-col relative" style={{ width: `${100 - splitPercent}%` }}>
                <div className="absolute top-3 left-4 z-10 text-xs font-medium text-txt-3 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/40 truncate max-w-[80%] flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors shadow-sm" onClick={handleSelectWorkspace}>
                   <FolderOpen className="size-3" />
                   {workspacePath}
                </div>
                <FilesPanel files={files} fileTree={fileTree} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
