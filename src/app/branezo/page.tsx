"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ChatPanel } from "@/components/branezo/chat-panel";
import { FilesPanel } from "@/components/branezo/files-panel";
import { cn } from "@/lib/utils";
import type { ChatMessage, FileChange, FileTreeNode } from "@/components/branezo/types";
import { MOCK_FILE_CHANGES, MOCK_FILE_TREE, SUGGESTED_PROMPTS } from "@/components/branezo/mock-data";
import { GripVertical, FolderOpen, Bot } from "lucide-react";
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
    currentSessionId,
    workspacePath,
    setWorkspacePath,
    clearMessages
  } = useChatStore();

  const [files] = useState<FileChange[]>(MOCK_FILE_CHANGES); // Kept mocked for now until real fs watcher
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [model, setModel] = useState("openai:gpt-4-turbo");

  // Resizable panels
  const [splitPercent, setSplitPercent] = useState(42);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectWorkspace = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.browseFiles({
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      setWorkspacePath(result.filePaths[0]);
    }
  };

  useEffect(() => {
    if (!workspacePath || !window.electronAPI) return;
    
    // Load actual file tree when workspace changes
    window.electronAPI.readFileTree(workspacePath).then(tree => {
      if (tree) setFileTree(tree);
    });
  }, [workspacePath]);

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

    const cleanupFinish = window.electronAPI.onBraneZOFinish(currentSessionId, (canonicalMessages: any[]) => {
      setThinking(false);
      
      // AI SDK returns messages in CoreMessage format. 
      // Synchronize these with the UI messages to ensure history is valid.
      setMessages((prev) => {
        const synced = [...prev];
        
        // Find where this turn started in the UI state
        let lastUserIdxUI = -1;
        for (let i = synced.length - 1; i >= 0; i--) {
           if (synced[i].role === "user") {
              lastUserIdxUI = i;
              break;
           }
        }

        if (lastUserIdxUI === -1) return synced;

        // Find the last user message in canonical history to only process NEW messages
        let lastUserIdxCanonical = -1;
        for (let i = canonicalMessages.length - 1; i >= 0; i--) {
           if (canonicalMessages[i].role === "user") {
              lastUserIdxCanonical = i;
              break;
           }
        }

        const newMessages = lastUserIdxCanonical >= 0 
           ? canonicalMessages.slice(lastUserIdxCanonical + 1) 
           : canonicalMessages;

        // Map canonical messages (Assistant, Tool, etc.) back to UI ChatMessage format
        const turnResults = [];
        let currentAssistant: any = null;

        for (const m of newMessages) {
           const role = m.role === "model" ? "assistant" : m.role;
           
           if (role === "assistant") {
              currentAssistant = {
                 id: `msg-${Date.now()}-${turnResults.length}`,
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
                       currentAssistant.toolUse.push({
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
              // UI stores tool results INSIDE the preceding assistant message's toolUse array
              if (currentAssistant && Array.isArray(m.content)) {
                 for (const part of m.content) {
                    const tc = currentAssistant.toolUse.find((t: any) => t.id === part.toolCallId || t.toolName === part.toolName);
                    if (tc) {
                       tc.output = part.output && typeof part.output === "object" && part.output.value ? part.output.value : JSON.stringify(part.output);
                       tc.status = part.isError || (part.output && part.output.type === "error-text") ? "error" : "success";
                    }
                 }
              }
           }
        }

        // Replace everything from the last user message onwards
        // synced[lastUserIdxUI] is the User message, turnResults are the responses
        synced.splice(lastUserIdxUI + 1, synced.length - (lastUserIdxUI + 1), ...turnResults);
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
      if (!workspacePath) return;

      const trimmedContent = content.trim();
      
      // Intercept Slash Commands
      if (trimmedContent === "/clear" || trimmedContent === "/reset") {
         clearMessages();
         if (window.electronAPI) {
            window.electronAPI.abortBraneZOChat(currentSessionId);
         }
         return;
      }
      
      if (trimmedContent === "/help") {
         const helpMsg: ChatMessage = {
           id: `msg-${Date.now()}`,
           role: "assistant",
           content: `**BraneZO Slash Commands**\n\n- \`/clear\` or \`/reset\`: Clear the conversation history and start fresh.\n- \`/settings\`: Open the provider configuration dialog.\n- \`/model\`: Open the model selection menu.\n- \`/help\`: Show this help message.\n\n**Mentions**\n- Type \`@\` followed by a file name to inject its contents directly into the prompt context.`,
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, helpMsg]);
         return;
      }

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
          messages: [...messages, userMsg].filter(m => m.role === "user" ? (m.content && m.content.trim() !== "") : true),
          workspacePath: workspacePath,
          providerId: providerId,
          modelId: modelId,
          apiKey: apiKey
        });
      } else {
        setThinking(false); // Can't send if no electron
      }
    },
    [messages, model, currentSessionId, workspacePath]
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
          {!workspacePath ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center bg-surface-2/20">
               <div className="flex flex-col items-center max-w-sm">
                  <div className="size-20 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center mb-6 shadow-xl shadow-primary/5">
                     <Bot className="size-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-3">Welcome to BraneZO</h2>
                  <p className="text-sm text-txt-3 mb-8 leading-relaxed">
                     Your autonomous coding agent is ready. To get started, select a folder on your computer that you want the agent to work on.
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
                  sessionTitle={workspacePath.split(/[\/\\]/).pop() || "BraneZO"}
                  fileTree={fileTree}
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
                className="overflow-hidden flex flex-col relative"
                style={{ width: `${100 - splitPercent}%` }}
              >
                <div className="absolute top-3 left-4 z-10 text-xs font-medium text-txt-3 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/40 truncate max-w-[80%] flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors shadow-sm" onClick={handleSelectWorkspace} title="Click to change workspace">
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
