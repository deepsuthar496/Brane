"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { Bot, Folder, Database } from "lucide-react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResizeHandle } from "./_components/resize-handle";
import { useFileTreeStore } from "@/store/file-tree-store";

// Extracted components
import { FileTreeItem } from "./_components/file-tree-item";
import { ChatInputSection } from "./_components/chat-input-section";
import { ChatMessages } from "./_components/chat-messages";
import { EditorPanel } from "./_components/editor-panel";
import { Problem } from "./_components/problems-panel";

export default function BrainzoPage() {
  const [models, setModels] = useState<{ id: string; name: string; provider: string; providerKey?: string; contextWindow?: number }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("brane_last_model") || "groq/llama-3.3-70b-versatile";
    }
    return "groq/llama-3.3-70b-versatile";
  });
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const { fileTree, setFileTree } = useFileTreeStore();
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ groq?: string; cerebras?: string; openrouter?: string; copilot?: string }>({});
  const [text, setText] = useState<string>("");
  const [codebaseIndexerEnabled, setCodebaseIndexerEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [modelPricing, setModelPricing] = useState<Record<string, { input: number; output: number }>>({});
  const [sessionTokens, setSessionTokens] = useState({ input: 0, output: 0, total: 0 });
  const [sessionCost, setSessionCost] = useState(0);
  const [workspaceRoot, setWorkspaceRoot] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("brane_last_folder") || undefined;
    }
    return undefined;
  });
  const [slashCommandOpen, setSlashCommandOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isScanningDiagnostics, setIsScanningDiagnostics] = useState(false);
  const [buildMode, setBuildMode] = useState<"Build" | "Plan">("Build");
  const [creativeMode, setCreativeMode] = useState<"Default" | "Creative" | "Precise">("Default");
  const [isMounted, setIsMounted] = useState(false);

  const chatHelpers = useChat({
    maxSteps: 10,
    headers: {
      ...(apiKeys.groq ? { 'x-groq-api-key': apiKeys.groq } : {}),
      ...(apiKeys.cerebras ? { 'x-cerebras-api-key': apiKeys.cerebras } : {}),
      ...(apiKeys.openrouter ? { 'x-openrouter-api-key': apiKeys.openrouter } : {}),
      ...(apiKeys.copilot ? { 'x-github-copilot-token': apiKeys.copilot } : {})
    },
    body: {
      model: selectedModel,
      codebaseIndexerEnabled,
      memoryEnabled,
      workspaceRoot,
      buildMode,
      creativeMode,
    }
  } as Record<string, unknown> as any);

  const { messages, status, error, setMessages, addToolResult } = chatHelpers as Record<string, any>;

  const isStreaming = status === 'streaming';

  const handleSendMessage = (msgOrObj: string | Record<string, unknown>, options?: Record<string, unknown>) => {
    // Determine if we're dealing with a raw string or a full message object
    const isObject = typeof msgOrObj === 'object' && msgOrObj !== null;
    const message = isObject ? msgOrObj : { role: 'user', content: msgOrObj as string };

    // Dynamically find the send function to support varying AI SDK versions
    const sendFn = (chatHelpers as Record<string, any>).append || (chatHelpers as Record<string, any>).sendMessage || (chatHelpers as Record<string, any>).appendMessage;

    if (sendFn) {
      // Always grab latest keys from state to ensure "Sudden Refresh" works
      const latestHeaders = {
        ...(apiKeys.groq ? { 'x-groq-api-key': apiKeys.groq } : {}),
        ...(apiKeys.cerebras ? { 'x-cerebras-api-key': apiKeys.cerebras } : {}),
        ...(apiKeys.openrouter ? { 'x-openrouter-api-key': apiKeys.openrouter } : {}),
        ...(apiKeys.copilot ? { 'x-github-copilot-token': apiKeys.copilot } : {}),
        ...(options?.headers as object || {})
      };

      sendFn(message, {
        ...options,
        headers: latestHeaders,
        body: {
          model: selectedModel,
          codebaseIndexerEnabled,
          memoryEnabled,
          workspaceRoot,
          buildMode,
          creativeMode,
          ...(options?.body as object || {}),
        }
      });
    }
  };

  const fetchDiagnostics = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsScanningDiagnostics(true);
    try {
      const url = workspaceRoot ? `/api/diagnostics?root=${encodeURIComponent(workspaceRoot)}` : '/api/diagnostics';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProblems(data);
      }
    } catch (err) {
      console.error("Failed to fetch diagnostics", err);
    } finally {
      if (!isSilent) setIsScanningDiagnostics(false);
    }
  }, [workspaceRoot]);

  // Panel widths (pixel-based, persisted to localStorage)
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [chatWidth, setChatWidth] = useState(420);

  useEffect(() => {
    setIsMounted(true);
    const savedExplorer = localStorage.getItem('brane_explorer_width');
    if (savedExplorer) setExplorerWidth(parseInt(savedExplorer, 10));
    const savedChat = localStorage.getItem('brane_chat_width');
    if (savedChat) setChatWidth(parseInt(savedChat, 10));
  }, []);

  useEffect(() => {
    // Pause polling while the agent is streaming
    if (isStreaming) return;

    // Initial fetch
    fetchDiagnostics();

    // Poll every 2 seconds for real-time diagnostics (fast because LSP runs in background)
    const interval = setInterval(() => fetchDiagnostics(true), 2000);
    return () => clearInterval(interval);
  }, [fetchDiagnostics, isStreaming]);

  // Persist panel widths
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('brane_explorer_width', String(explorerWidth));
    }
  }, [explorerWidth, isMounted]);
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('brane_chat_width', String(chatWidth));
    }
  }, [chatWidth, isMounted]);

  const restoreToCheckpoint = (messageId: string) => {
    const index = messages.findIndex((m: any) => m.id === messageId);
    if (index !== -1) {
      setMessages(messages.slice(0, index + 1));
    }
  };

  const [dismissedQuestions, setDismissedQuestions] = useState<Set<string>>(new Set());

  const activeQuestion = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      const parts = (m as unknown as { parts?: Array<{ type: string; toolName?: string; state?: string; input?: string | Record<string, unknown>; toolCallId?: string }> }).parts;
      if (!parts) continue;
      for (const part of parts) {
        const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type?.startsWith('tool-') ? part.type.slice(5) : part.type;
        if (toolName === 'askUser' && part.state !== 'output-available' && part.state !== 'output-error') {
          const input = typeof part.input === 'string' ? JSON.parse(part.input) : part.input;
          if (input?.question) {
            return { toolCallId: part.toolCallId, input };
          }
        }
      }
    }
    return null;
  }, [messages]);

  const activePlan = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      const parts = (m as unknown as { parts?: Array<{ type: string; toolName?: string; state?: string; input?: string | Record<string, unknown>; toolCallId?: string }> }).parts;
      if (!parts) continue;
      for (const part of parts) {
        const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type?.startsWith('tool-') ? part.type.slice(5) : part.type;
        if (toolName === 'requestPlanApproval' && part.state !== 'output-available' && part.state !== 'output-error') {
          const input = typeof part.input === 'string' ? JSON.parse(part.input) : part.input;
          if (input?.summary) {
            return { toolCallId: part.toolCallId, input };
          }
        }
      }
    }
    return null;
  }, [messages]);

  // Persist preferences
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem("brane_last_model", selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (workspaceRoot) {
      localStorage.setItem("brane_last_folder", workspaceRoot);
    }
  }, [workspaceRoot]);

  const executeSlashCommand = (cmdName: string) => {
    setSlashCommandOpen(false);
    setText("");

    if (cmdName === "clear") {
      setMessages([]);
    } else if (cmdName === "settings") {
      window.dispatchEvent(new CustomEvent("open-settings"));
    } else if (cmdName === "memory") {
      const newState = !memoryEnabled;
      setMemoryEnabled(newState);
      localStorage.setItem("brane_memory_enabled", newState ? "true" : "false");
    } else if (cmdName === "indexer") {
      const newState = !codebaseIndexerEnabled;
      setCodebaseIndexerEnabled(newState);
      localStorage.setItem("brane_codebase_indexer", newState ? "true" : "false");
    }
  };

  useEffect(() => {
    const handleClear = () => setMessages([]);
    const handleMemory = () => {
      setMemoryEnabled(prev => {
        const next = !prev;
        localStorage.setItem("brane_memory_enabled", next ? "true" : "false");
        return next;
      });
    };
    const handleIndexer = () => {
      setCodebaseIndexerEnabled(prev => {
        const next = !prev;
        localStorage.setItem("brane_codebase_indexer", next ? "true" : "false");
        return next;
      });
    };

    const handleTokenUpdated = () => {
      console.log("[Brainzo] Token updated, refreshing keys...");
      const copilotToken = localStorage.getItem("github_copilot_token");
      if (copilotToken) {
        setApiKeys(prev => ({ ...prev, copilot: copilotToken }));
      }
    };

    window.addEventListener("brane-action-clear", handleClear);
    window.addEventListener("brane-action-memory", handleMemory);
    window.addEventListener("brane-action-indexer", handleIndexer);
    window.addEventListener("brane:github-token-updated", handleTokenUpdated);

    return () => {
      window.removeEventListener("brane-action-clear", handleClear);
      window.removeEventListener("brane-action-memory", handleMemory);
      window.removeEventListener("brane-action-indexer", handleIndexer);
      window.removeEventListener("brane:github-token-updated", handleTokenUpdated);
    };
  }, [setMessages]);

  useEffect(() => {
    async function loadKeys() {
      const copilotToken = localStorage.getItem("github_copilot_token");
      if (copilotToken) {
        setApiKeys(prev => ({ ...prev, copilot: copilotToken }));
      }

      const indexerState = localStorage.getItem("brane_codebase_indexer");
      if (indexerState !== null) {
        setCodebaseIndexerEnabled(indexerState === "true");
      }

      const memoryState = localStorage.getItem("brane_memory_enabled");
      if (memoryState !== null) {
        setMemoryEnabled(memoryState === "true");
      }
    }
    loadKeys();
  }, []);

  // Optimized token and cost estimation - non-blocking and stable
  const lastProcessedMessageCount = useRef(0);

  useEffect(() => {
    // Only run if message count changes AND we are not typing
    if (messages.length === lastProcessedMessageCount.current) return;

    lastProcessedMessageCount.current = messages.length;

    // Use requestIdleCallback or a small timeout to ensure this doesn't block the main thread
    const timer = setTimeout(() => {
      let inputChars = 0;
      let outputChars = 0;

      for (const m of messages) {
        // Safe check for parts and content fallback
        const msg = m as unknown as { content?: string; parts?: Array<{ type: string; text?: string }> };
        const contentText = msg.content || "";
        const partsText = msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '';
        const totalText = partsText || contentText;

        if (m.role === 'user') {
          inputChars += totalText.length;
        } else if (m.role === 'assistant') {
          outputChars += totalText.length;
        }
      }

      const estimatedInput = Math.ceil(inputChars / 4);
      const estimatedOutput = Math.ceil(outputChars / 4);
      const newTotal = estimatedInput + estimatedOutput;

      setSessionTokens({ input: estimatedInput, output: estimatedOutput, total: newTotal });

      if (selectedModel && modelPricing[selectedModel]) {
        const pricing = modelPricing[selectedModel];
        const cost = (estimatedInput / 1_000_000) * pricing.input + (estimatedOutput / 1_000_000) * pricing.output;
        setSessionCost(cost);
      }
    }, 500); // 500ms delay to keep the main thread free for typing

    return () => clearTimeout(timer);
  }, [messages.length, selectedModel, modelPricing]);

  useEffect(() => {
    const implementedProviders = ['groq', 'cerebras', 'openai', 'anthropic', 'google', 'openrouter', 'github-copilot'];

    // Filter function for high-signal chat models
    const isChatModel = (m: { id?: string; name?: string }) => {
      const lowerId = (m.id || '').toLowerCase();
      const lowerName = (m.name || '').toLowerCase();

      const isNonChat =
        lowerId.includes('embedding') ||
        lowerId.includes('image') ||
        lowerId.includes('vision') ||
        lowerId.includes('dall-e') ||
        lowerId.includes('tts') ||
        lowerId.includes('whisper') ||
        lowerId.includes('babbage') ||
        lowerId.includes('davinci') ||
        lowerName.includes('embedding') ||
        lowerName.includes('image') ||
        lowerName.includes('moderation');

      return !isNonChat;
    };

    async function fetchModels() {
      // 1. Try to load from cache first for instant UI
      const CACHE_KEY = "brane_models_cache";
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { models: cachedModels, pricing: cachedPricing, timestamp } = JSON.parse(cached);
          // Only use cache if it's less than 24 hours old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            // APPLY FILTER TO CACHE
            const filteredCached = cachedModels.filter(isChatModel);
            setModels(filteredCached);
            setModelPricing(cachedPricing);
            if (filteredCached.length > 0 && !filteredCached.find((m: { id: string }) => m.id === selectedModel)) {
              setSelectedModel(filteredCached[0].id);
            }
          }
        } catch (e) {
          console.warn("Failed to parse model cache", e);
        }
      }

      // 2. Fetch fresh data in the background
      try {
        const res = await fetch('https://models.dev/api.json');
        const data = await res.json();

        const availableModels: { id: string; name: string; provider: string; providerKey?: string; contextWindow?: number }[] = [];
        const pricingMap: Record<string, { input: number; output: number }> = {};

        // Add all models from models.dev for implemented providers
        Object.entries(data).forEach(([providerKey, providerData]: [string, any]) => {
          if (implementedProviders.includes(providerKey) && providerData.models) {
            Object.values(providerData.models).forEach((m: any) => {
              const id = `${providerKey}/${m.id}`;

              if (!isChatModel(m)) return;

              // Avoid duplicates if already added (like Copilot)
              if (!availableModels.find(existing => existing.id === id)) {
                availableModels.push({
                  id,
                  name: m.name,
                  provider: providerData.name || providerKey,
                  providerKey: providerKey,
                  contextWindow: m.limit?.context || m.context_window
                });
                pricingMap[id] = m.cost || { input: 0, output: 0 };
              }
            });
          }
        });

        // Update state and cache
        setModels(availableModels);
        setModelPricing(pricingMap);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          models: availableModels,
          pricing: pricingMap,
          timestamp: Date.now()
        }));

        if (availableModels.length > 0 && !availableModels.find(m => m.id === selectedModel)) {
          setSelectedModel(availableModels[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch models", err);
      }
    }
    fetchModels();
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const url = workspaceRoot ? `/api/files?root=${encodeURIComponent(workspaceRoot)}` : '/api/files';
      const res = await fetch(url);
      const tree = await res.json();
      if (Array.isArray(tree)) {
        setFileTree(tree);
      }
    } catch (err) {
      console.error("Failed to fetch file tree", err);
    }
  }, [workspaceRoot]);

  useEffect(() => {
    // Pause file polling while the agent is streaming — avoids competing setState calls
    if (isStreaming) return;
    fetchFiles();
    const interval = setInterval(fetchFiles, 5000); // Poll every 5 seconds when idle
    return () => clearInterval(interval);
  }, [fetchFiles, isStreaming]);

  const handleFileSelect = async (path: string) => {
    setIsFileLoading(true);
    try {
      const url = workspaceRoot
        ? `/api/files/content?path=${encodeURIComponent(path)}&root=${encodeURIComponent(workspaceRoot)}`
        : `/api/files/content?path=${encodeURIComponent(path)}`;
      const res = await fetch(url);
      if (res.ok) {
        const content = await res.text();
        setSelectedFile({ path, content });
      }
    } catch (err) {
      console.error("Failed to fetch file content", err);
    } finally {
      setIsFileLoading(false);
    }
  };

  const getLanguageFromPath = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'sh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sql': 'sql',
      'rust': 'rs',
      'go': 'go',
      'c': 'c',
      'cpp': 'cpp',
      'java': 'java',
    };
    return map[ext] || '';
  };

  // Replaced manual input submission logic with PromptInput logic

  if (!isMounted) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Titlebar />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />

        <main className="flex-1 flex overflow-hidden">

          {/* Left Panel: File Explorer */}
          <div
            className="border-r border-border bg-muted/10 flex flex-col h-full overflow-hidden shrink-0"
            style={{ width: explorerWidth }}
          >
            <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
              <h2 className="text-sm font-semibold tracking-tight">Explorer</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  if (typeof window !== 'undefined' && window.electronAPI) {
                    const result = await window.electronAPI.browseFiles({
                      properties: ["openDirectory"]
                    });
                    if (!result.canceled && result.filePaths.length > 0) {
                      setWorkspaceRoot(result.filePaths[0]);
                    }
                  }
                }}
              >
                <Folder className="size-3 mr-1.5" />
                Change
              </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="py-2">
                {fileTree.map((item) => (
                  <FileTreeItem key={item.id} item={item} onSelect={handleFileSelect} />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Resize handle: Explorer ↔ Chat */}
          <ResizeHandle
            direction="horizontal"
            size={explorerWidth}
            min={160}
            max={400}
            onResize={setExplorerWidth}
          />

          {/* Middle Panel: Chat */}
          <div
            className="flex flex-col border-r border-border bg-card h-full overflow-hidden shrink-0"
            style={{ width: chatWidth }}
          >
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                {codebaseIndexerEnabled && (
                  <button
                    onClick={() => setShowGraph(!showGraph)}
                    className={`flex items-center gap-1.5 px-2 py-1 border rounded-md transition-colors cursor-pointer ${showGraph
                      ? "bg-green-500/20 border-green-500/40"
                      : "bg-green-500/10 border-green-500/20 hover:bg-green-500/20"
                      }`}
                    title="Toggle Codebase Structure Graph"
                  >
                    <Database className="size-3 text-green-500" />
                    <span className="text-[10px] font-medium text-green-500">Indexed</span>
                  </button>
                )}
                {memoryEnabled && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md" title="Memory enabled: Agent remembers context across sessions">
                    <Bot className="size-3 text-blue-500" />
                    <span className="text-[10px] font-medium text-blue-500">Memory</span>
                  </div>
                )}

                <Popover>
                  <PopoverTrigger className="flex items-center p-1 hover:bg-muted rounded-lg transition-colors group">
                    <div className="relative size-7">
                      {/* Circular Progress Background */}
                      <svg className="size-full -rotate-90">
                        <circle
                          cx="14"
                          cy="14"
                          r="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-muted-foreground/10"
                        />
                        {/* Circular Progress Foreground */}
                        <circle
                          cx="14"
                          cy="14"
                          r="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={2 * Math.PI * 12}
                          strokeDashoffset={2 * Math.PI * 12 * (1 - Math.min(1, (sessionTokens.total / (models.find(m => m.id === selectedModel)?.contextWindow || 128000))))}
                          className="text-primary transition-all duration-500 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-1 rounded-full bg-primary" />
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[200px] p-3 bg-card border-border shadow-xl rounded-xl">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">{sessionTokens.total.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tokens</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          {Math.round((sessionTokens.total / (models.find(m => m.id === selectedModel)?.contextWindow || 128000)) * 100)}%
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Usage</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs font-bold text-foreground">
                          ${sessionCost < 0.0001 && sessionTokens.total > 0 ? '<$0.0001' : sessionCost.toFixed(4)}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cost</span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Chat Messages */}
            <Conversation>
              <ConversationContent>
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={<Bot className="size-12 mb-4 opacity-20" />}
                    title=""
                    description="I can read and write files in your workspace. Ask me to help you code!"
                  />
                ) : (
                  <ChatMessages
                    messages={messages}
                    status={status}
                    error={error}
                    addToolResult={addToolResult}
                    restoreToCheckpoint={restoreToCheckpoint}
                  />
                )}

                {error && messages.length === 0 && null}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <div className="p-0 bg-background border-t border-border shrink-0 relative">
              <ChatInputSection
                status={status}
                onSendMessage={handleSendMessage}
                selectedModel={selectedModel}
                models={models}
                setSelectedModel={setSelectedModel}
                activeQuestion={activeQuestion}
                activePlan={activePlan}
                dismissedQuestions={dismissedQuestions}
                setDismissedQuestions={setDismissedQuestions}
                addToolResult={addToolResult}
                apiKeys={apiKeys}
                codebaseIndexerEnabled={codebaseIndexerEnabled}
                memoryEnabled={memoryEnabled}
                workspaceRoot={workspaceRoot}
                fileTree={fileTree}
                onFileSelect={handleFileSelect}
                problems={problems}
                buildMode={buildMode}
                setBuildMode={setBuildMode}
                creativeMode={creativeMode}
                setCreativeMode={setCreativeMode}
              />
            </div>
          </div>

          {/* Resize handle: Chat ↔ Editor */}
          <ResizeHandle
            direction="horizontal"
            size={chatWidth}
            min={300}
            max={700}
            onResize={setChatWidth}
          />

          {/* Right Panel: Editor View — takes all remaining space */}
          <div className="flex-1 flex flex-col bg-surface-2 overflow-hidden relative min-w-[200px]">
            <EditorPanel
              showGraph={showGraph}
              setShowGraph={setShowGraph}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              isFileLoading={isFileLoading}
              fileTree={fileTree}
              handleFileSelect={handleFileSelect}
              getLanguageFromPath={getLanguageFromPath}
              problems={problems}
              isScanningDiagnostics={isScanningDiagnostics}
              onSelectProblem={(p) => handleFileSelect(p.file)}
              onClearProblems={() => setProblems([])}
              onSendToAgent={(probs) => {
                window.dispatchEvent(new CustomEvent("brane-attach-problems", { detail: probs }));
              }}
            />
          </div>

        </main>
      </div>
    </div>
  );
}
