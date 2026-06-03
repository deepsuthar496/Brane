"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, ArrowUp, Check, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputTools,
  PromptInputHeader,
  PromptInputBody,
  usePromptInputAttachments,
  PromptInputAddAttachmentsButton,
} from "@/components/ai-elements/prompt-input";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SessionQuestionDock } from "./session-question-dock";
import { SLASH_COMMANDS } from "./constants";
import { ProviderIcon } from "@/components/ui/provider-icon";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline" className="px-3 pt-3">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

interface ChatInputSectionProps {
  status: string;
  onSendMessage: (msg: any, options?: any) => void;
  selectedModel: string;
  models: any[];
  setSelectedModel: (model: string) => void;
  activeQuestion?: any;
  activePlan?: any;
  dismissedQuestions: Set<string>;
  setDismissedQuestions: React.Dispatch<React.SetStateAction<Set<string>>>;
  addToolResult: (args: any) => void;
  apiKeys: any;
  codebaseIndexerEnabled: boolean;
  memoryEnabled: boolean;
  workspaceRoot?: string;
  fileTree: any[];
  onFileSelect: (path: string) => void;
  problems?: any[];
  buildMode: "Build" | "Plan";
  setBuildMode: React.Dispatch<React.SetStateAction<"Build" | "Plan">>;
  creativeMode: "Default" | "Creative" | "Precise";
  setCreativeMode: React.Dispatch<React.SetStateAction<"Default" | "Creative" | "Precise">>;
}

export const ChatInputSection = React.memo(({ 
  status, 
  onSendMessage, 
  selectedModel, 
  models, 
  setSelectedModel, 
  activeQuestion, 
  dismissedQuestions, 
  setDismissedQuestions, 
  addToolResult, 
  apiKeys, 
  codebaseIndexerEnabled, 
  memoryEnabled, 
  workspaceRoot,
  fileTree,
  onFileSelect,
  problems = [],
  buildMode,
  setBuildMode,
  creativeMode,
  setCreativeMode
}: ChatInputSectionProps) => {
  const { resolvedTheme } = useTheme();
  const [text, setText] = useState("");
  const [slashCommandOpen, setSlashCommandOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [fileMentionOpen, setFileMentionOpen] = useState(false);
  const [fileMentionFilter, setFileMentionFilter] = useState("");
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [installedSkills, setInstalledSkills] = useState<any[]>([]);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const url = workspaceRoot ? `/api/skills?root=${encodeURIComponent(workspaceRoot)}` : '/api/skills';
        const res = await fetch(url);
        if (res.ok) {
          const skillsList = await res.json();
          const skillsArray = skillsList.map((skill: any) => ({
            name: skill.name,
            description: skill.description || "Agent Skill",
            type: "skill"
          }));
          setInstalledSkills(skillsArray);
        }
      } catch (err) {
        console.error("Failed to fetch skills", err);
      }
    };
    fetchSkills();
  }, [workspaceRoot]);

  // ── Mode Cycling Logic (Tab Key) ───────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Prevent default tab behavior if focus is in textarea to allow cycling
        // Or only cycle if user is focusing the input area
        const activeElement = document.activeElement;
        if (activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "INPUT") {
          e.preventDefault();
          setBuildMode((prev: any) => prev === "Build" ? "Plan" : "Build");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setBuildMode]);

  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const handleAttachProblems = (e: any) => {
      const problems = e.detail;
      if (!problems || problems.length === 0) return;
      
      const currentText = textRef.current;
      const tag = "@current_problems";
      if (!currentText.includes(tag)) {
        setText(prev => prev ? `${prev} ${tag}` : tag);
      }
    };

    window.addEventListener("brane-attach-problems", handleAttachProblems);
    return () => window.removeEventListener("brane-attach-problems", handleAttachProblems);
  }, []);

  const flatFiles = useMemo(() => {
    const result: any[] = [];
    const flatten = (items: any[]) => {
      if (!items || !Array.isArray(items)) return;
      for (const item of items) {
        if (item.type === 'file') {
          result.push(item);
        } else if (item.children) {
          flatten(item.children);
        }
      }
    };
    flatten(fileTree);
    return result;
  }, [fileTree]);

  const filteredFiles = useMemo(() => {
    if (!fileMentionOpen) return [];
    if (!fileMentionFilter) return flatFiles.slice(0, 10);
    const lowerFilter = fileMentionFilter.toLowerCase();
    return flatFiles.filter(f => f.name.toLowerCase().includes(lowerFilter) || f.id.toLowerCase().includes(lowerFilter)).slice(0, 10);
  }, [flatFiles, fileMentionFilter, fileMentionOpen]);

  const combinedSlashCommands = useMemo(() => {
    return [
      ...SLASH_COMMANDS.map(cmd => ({ ...cmd, type: "action" })),
      ...installedSkills
    ];
  }, [installedSkills]);

  const filteredSlashCommands = useMemo(() => {
    if (!slashCommandOpen) return [];
    return combinedSlashCommands.filter(cmd => cmd.name.startsWith(slashFilter.toLowerCase()));
  }, [slashFilter, slashCommandOpen, combinedSlashCommands]);

  // Reset selected index when filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [fileMentionFilter, slashFilter, fileMentionOpen, slashCommandOpen]);

  const executeSlashCommand = (cmd: any) => {
    setSlashCommandOpen(false);

    if (cmd.type === "skill") {
      const textBeforeCursor = text.slice(0, selectionStart);
      const textAfterCursor = text.slice(selectionStart);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const newText = text.substring(0, lastSlashIndex) + '/' + cmd.name + '  ' + textAfterCursor;
        setText(newText);
      }
    } else {
      setText("");
      if (cmd.name === "clear") {
        window.dispatchEvent(new CustomEvent("brane-action-clear"));
      } else if (cmd.name === "settings") {
        window.dispatchEvent(new CustomEvent("open-settings"));
      } else if (cmd.name === "memory") {
        window.dispatchEvent(new CustomEvent("brane-action-memory"));
      } else if (cmd.name === "indexer") {
        window.dispatchEvent(new CustomEvent("brane-action-indexer"));
      }
    }
  };

  const executeFileMention = (fileId: string) => {
    const textBeforeCursor = text.slice(0, selectionStart);
    const textAfterCursor = text.slice(selectionStart);
    const lastMentionIndex = textBeforeCursor.lastIndexOf('@');
    if (lastMentionIndex !== -1) {
      // Use forward slashes for the file path insertion
      const normalizedFileId = fileId.replace(/\\/g, '/');
      const newText = text.substring(0, lastMentionIndex) + '@' + normalizedFileId + ' ' + textAfterCursor;
      setText(newText);
    }
    setFileMentionOpen(false);
  };

  const handleSubmit = (message: any) => {
    let finalContent = message.text || "Sent with attachments";
    
    // Expand @current_problems if present
    if (finalContent.includes("@current_problems")) {
      const problemsText = problems.length > 0 
        ? problems.map((p: any) => `- [${p.type.toUpperCase()}] ${p.message} (${p.file}:${p.line}:${p.column})`).join('\n')
        : "No active problems detected.";
      
      finalContent = finalContent.replace("@current_problems", `\n\n### Current Workspace Problems:\n${problemsText}\n`);
    }

    onSendMessage(
      {
        role: 'user',
        content: finalContent,
        experimental_attachments: message.files,
      },
      {
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
          creativeMode
        }
      }
    );
    setText("");
    setSlashCommandOpen(false);
    setFileMentionOpen(false);
  };

  const [modelSearchOpen, setModelSearchOpen] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string | null>(null);

  const providers = useMemo(() => {
    if (!modelSearchOpen) return [];
    const p = new Set<string>();
    if (Array.isArray(models)) {
      models.forEach((m: any) => {
        if (m.providerKey) p.add(m.providerKey);
      });
    }
    return Array.from(p).sort();
  }, [models, modelSearchOpen]);

  const filteredModels = useMemo(() => {
    if (!modelSearchOpen) return [];
    if (!providerFilter) return models;
    return models.filter((m: any) => m.providerKey === providerFilter);
  }, [models, providerFilter, modelSearchOpen]);

  const isDark = resolvedTheme !== 'light';

  return (
    <div className="p-4 bg-background border-t border-border shrink-0 relative">
      {slashCommandOpen && (
        <div className="absolute bottom-full inset-x-4 z-50 bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1.5 mb-2 max-h-[280px] overflow-y-auto flex flex-col gap-0.5">
          {filteredSlashCommands.length > 0 ? (
            filteredSlashCommands.map((cmd, idx) => (
              <button
                key={cmd.name}
                className={cn(
                  "w-full flex items-center justify-between gap-4 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                  idx === selectedIndex 
                    ? "bg-muted text-foreground" 
                    : "hover:bg-muted/45 text-foreground/90"
                )}
                onClick={() => executeSlashCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {cmd.type === "skill" ? (
                    <Star className="size-4 text-amber-500 fill-amber-500/20 shrink-0" />
                  ) : cmd.icon ? (
                    <cmd.icon className="size-4 text-muted-foreground shrink-0" />
                  ) : null}
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-semibold text-foreground shrink-0 text-[14px]">/{cmd.name}</span>
                    <span className="text-[12px] text-muted-foreground/80 truncate">{cmd.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {cmd.type === "skill" ? (
                    <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Skill
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                      System
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">No commands found</div>
          )}
        </div>
      )}

      {fileMentionOpen && (
        <div className="absolute bottom-full inset-x-4 z-50 bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1.5 mb-2 max-h-[280px] overflow-y-auto flex flex-col gap-0.5">
          {filteredFiles.length > 0 ? (
            filteredFiles.map((file, idx) => {
              const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
              const isTS = ext === 'TS' || ext === 'TSX';
              const isJS = ext === 'JS' || ext === 'JSX';
              const isCSS = ext === 'CSS';
              const isHTML = ext === 'HTML';
              const isJSON = ext === 'JSON';
              const isMD = ext === 'MD' || ext === 'MDX';
              return (
                <button
                  key={file.id}
                  className={cn(
                    "w-full flex items-center justify-between gap-4 px-3 py-2 text-sm rounded-lg transition-colors text-left",
                    idx === selectedIndex 
                      ? "bg-muted text-foreground" 
                      : "hover:bg-muted/45 text-foreground/90"
                  )}
                  onClick={() => executeFileMention(file.id)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "text-[10px] font-bold w-9 text-center py-0.5 rounded shrink-0",
                      isTS ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                      isJS ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20" :
                      isCSS ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20" :
                      isHTML ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20" :
                      isJSON ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" :
                      isMD ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                      "bg-muted text-muted-foreground border border-border/40"
                    )}>{ext}</span>
                    <span className="font-semibold text-foreground shrink-0 text-[14px]">{file.name}</span>
                    <span className="text-[12px] text-muted-foreground/80 truncate">
                      {file.id.replace(/\\/g, '/')}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider shrink-0 bg-muted px-1.5 py-0.5 rounded border border-border/40">
                    File
                  </div>
                </button>
              )
            })
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">No files found</div>
          )}
        </div>
      )}
      
      <div className="flex flex-col gap-0">
        {activeQuestion && !dismissedQuestions.has(activeQuestion.toolCallId) && (
          <SessionQuestionDock 
            activeQuestion={activeQuestion} 
            onReply={(answer) => {
              addToolResult({ toolCallId: activeQuestion.toolCallId, result: answer });
            }} 
            onDismiss={() => {
              setDismissedQuestions((prev: Set<string>) => new Set(prev).add(activeQuestion.toolCallId));
              addToolResult({ toolCallId: activeQuestion.toolCallId, result: 'User dismissed the question without answering.' });
            }} 
          />
        )}
        <PromptInput
          onSubmit={handleSubmit}
          className="relative w-full border border-border/60 bg-muted/5 rounded-xl overflow-hidden shadow-sm transition-shadow focus-within:border-border focus-within:shadow-sm"
          multiple
          globalDrop
        >
          <PromptInputHeader>
            <PromptInputAttachmentsDisplay />
          </PromptInputHeader>
          <PromptInputBody>
            <div className="relative flex-1 w-full min-w-0">
              <div 
                className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words px-4 pt-2 pb-12 text-[14px] leading-relaxed font-inherit z-0"
                aria-hidden="true"
              >
                {text.split(/(\/[a-zA-Z0-9_-]+)/g).map((part, i) => {
                  const isSkill = installedSkills.some(s => `/${s.name}` === part);
                  if (isSkill) {
                    return (
                      <span key={i} className="relative text-transparent">
                        <span className="absolute left-[-6px] right-[-2px] -inset-y-[1px] bg-primary/15 border border-primary/20 rounded-md"></span>
                        {part}
                      </span>
                    );
                  }
                  return <span key={i} className="text-transparent">{part}</span>;
                })}
                {text.endsWith('\n') ? <br /> : null}
              </div>
            <PromptInputTextarea
              value={text}
              onSelect={(e) => setSelectionStart(e.currentTarget.selectionStart)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  const selStart = e.currentTarget.selectionStart;
                  const selEnd = e.currentTarget.selectionEnd;
                  if (selStart === selEnd) {
                    const regex = /\/[a-zA-Z0-9_-]+/g;
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                      const pillText = match[0];
                      const skillName = pillText.slice(1);
                      const isValidSkill = installedSkills.some(s => s.name === skillName);
                      if (isValidSkill) {
                        const start = match.index;
                        const end = start + pillText.length;
                        if (selStart > start && selStart <= end) {
                          e.preventDefault();
                          const newText = text.slice(0, start) + text.slice(end);
                          setText(newText);
                          setSelectionStart(start);
                          const target = e.currentTarget;
                          setTimeout(() => {
                            target.setSelectionRange(start, start);
                          }, 0);
                          break;
                        }
                      }
                    }
                  }
                }

                if (fileMentionOpen || slashCommandOpen) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (fileMentionOpen) {
                      setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
                    } else if (slashCommandOpen) {
                      setSelectedIndex(prev => Math.min(prev + 1, filteredSlashCommands.length - 1));
                    }
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (fileMentionOpen && filteredFiles[selectedIndex]) {
                      executeFileMention(filteredFiles[selectedIndex].id);
                    } else if (slashCommandOpen && filteredSlashCommands[selectedIndex]) {
                      executeSlashCommand(filteredSlashCommands[selectedIndex]);
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setFileMentionOpen(false);
                    setSlashCommandOpen(false);
                  }
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setText(val);
                const pos = e.target.selectionStart || val.length;
                setSelectionStart(pos);

                // Check for slash command at the start
                const slashMatch = val.match(/^\/([a-zA-Z]*)$/);
                if (slashMatch) {
                  setSlashCommandOpen(true);
                  setSlashFilter(slashMatch[1]);
                  setFileMentionOpen(false);
                } else {
                  setSlashCommandOpen(false);
                  
                  // Check for file mention
                  const textBeforeCursor = val.slice(0, pos);
                  const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);
                  if (mentionMatch) {
                    setFileMentionOpen(true);
                    setFileMentionFilter(mentionMatch[1]);
                  } else {
                    setFileMentionOpen(false);
                  }
                }
              }}
              placeholder="Ask anything..."
              className="relative z-10 min-h-[64px] max-h-[320px] !bg-transparent border-none focus-visible:ring-0 shadow-none px-4 pt-2 pb-12 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground/70"
            />
            </div>
          </PromptInputBody>
          
          <div className="absolute bottom-2 left-2 pointer-events-auto">
            <PromptInputTools>
              <PromptInputAddAttachmentsButton className="size-8 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors bg-transparent border-none shadow-none p-0 flex items-center justify-center" />
            </PromptInputTools>
          </div>

          <div className="absolute bottom-2 right-2 flex items-center pointer-events-auto">
            <PromptInputFooter className="p-0 border-none bg-transparent">
              <Button
                type="submit"
                disabled={!text && status !== 'ready' && status !== 'error'}
                size="icon-sm"
                className={cn(
                  "rounded-md size-8 border-none shadow-none flex items-center justify-center transition-colors px-0",
                  (!text && status !== 'ready' && status !== 'error') 
                    ? "bg-muted/40 text-muted-foreground/40" 
                    : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                <ArrowUp className="size-4" />
              </Button>
            </PromptInputFooter>
          </div>
        </PromptInput>

        {/* Bottom Toolbar */}
        <div className="flex items-center gap-1.5 px-2 pt-3 pb-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="sm" className="h-7 text-[12px] font-medium text-foreground/80 hover:text-foreground gap-1.5 px-2 hover:bg-muted/50 rounded-md transition-colors">
                {buildMode}
                <ChevronDown className="size-3 opacity-50" />
              </Button>
            } />
            <DropdownMenuContent align="start" className="w-[120px]">
              <DropdownMenuItem className="text-xs" onClick={() => setBuildMode("Build")}>Build</DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => setBuildMode("Plan")}>Plan</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={modelSearchOpen} onOpenChange={setModelSearchOpen}>
            <PopoverTrigger render={
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 border-none bg-transparent hover:bg-muted/50 px-2 gap-2 text-foreground/80 hover:text-foreground shadow-none text-[12px] font-medium min-w-[140px] max-w-[220px] transition-colors rounded-md focus:ring-0 justify-start"
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedModel && (
                    <ProviderIcon
                      provider={models.find((m: any) => m.id === selectedModel)?.providerKey || 'unknown'}
                      modelId={selectedModel}
                      className="size-3.5 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                  <span className="truncate">{models.find((m: any) => m.id === selectedModel)?.name || "Select model"}</span>
                  <ChevronDown className="size-3 opacity-50 ml-auto" />
                </div>
              </Button>
            } />
            <PopoverContent className="p-0 w-[340px] overflow-hidden bg-card border-border shadow-2xl rounded-xl backdrop-blur-xl" align="start" sideOffset={8}>
              <Command className="bg-transparent">
                <div className="flex flex-col border-b border-border/50 bg-muted/20">
                  <div className="flex items-center px-3 pt-3">
                    <Search className="size-4 text-muted-foreground/50 mr-2" />
                    <CommandInput 
                      placeholder="Search for a model..." 
                      className="h-9 border-none bg-transparent focus:ring-0 text-[13px] placeholder:text-muted-foreground/40 w-full" 
                    />
                  </div>
                  
                  <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2.5 no-scrollbar scroll-smooth">
                    <button
                      onClick={() => setProviderFilter(null)}
                      className={cn(
                        "h-6 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all shrink-0",
                        providerFilter === null 
                          ? "bg-foreground text-background shadow-sm" 
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      All
                    </button>
                    {providers.map((p) => (
                      <button
                        key={p}
                        onClick={() => setProviderFilter(p)}
                        className={cn(
                          "h-6 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5",
                          providerFilter === p 
                            ? "bg-foreground text-background shadow-sm" 
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        <ProviderIcon 
                          provider={p} 
                          forceBlack={providerFilter === p}
                          className={cn("size-3 object-contain", providerFilter === p ? "opacity-100" : "opacity-70")}
                        />
                        {p.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <CommandList className="max-h-[340px] scrollbar-none">
                  <CommandEmpty className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Search className="size-8 text-muted-foreground" />
                      <span className="text-[13px] font-medium">No matching models found</span>
                    </div>
                  </CommandEmpty>
                  
                  <CommandGroup heading={<span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest px-1">Available Models</span>}>
                    <div className="px-1.5 pb-2">
                      {filteredModels.map((m: any) => {
                        const isSelected = selectedModel === m.id;
                        return (
                          <CommandItem
                            key={m.id}
                            value={m.id}
                            onSelect={(currentValue) => {
                              setSelectedModel(currentValue);
                              setModelSearchOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 mb-0.5",
                              isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                            )}
                          >
                            <div className="size-8 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                              <ProviderIcon
                                provider={m.providerKey || m.provider.toLowerCase()}
                                modelId={m.id}
                                className={cn("size-4 object-contain", isSelected ? "opacity-100" : "opacity-60")}
                              />
                            </div>
                            
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-[13px] font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
                                  {m.name}
                                </span>
                                {m.contextWindow && (
                                  <span className="text-[9px] font-bold text-muted-foreground/40 bg-muted/50 px-1 rounded uppercase tracking-tighter shrink-0">
                                    {Math.round(m.contextWindow / 1000)}k
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground/60 truncate capitalize flex items-center gap-1.5">
                                {m.providerKey || m.provider}
                                <span className="size-1 rounded-full bg-border" />
                                Stable
                              </span>
                            </div>
                            
                            {isSelected && (
                              <div className="size-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                <Check className="size-3 text-primary-foreground font-bold" />
                              </div>
                            )}
                          </CommandItem>
                        );
                      })}
                    </div>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="sm" className="h-7 text-[12px] font-medium text-foreground/80 hover:text-foreground gap-1.5 px-2 hover:bg-muted/50 rounded-md transition-colors">
                {creativeMode}
                <ChevronDown className="size-3 opacity-50" />
              </Button>
            } />
            <DropdownMenuContent align="start" className="w-[120px]">
              <DropdownMenuItem className="text-xs" onClick={() => setCreativeMode("Default")}>Default</DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => setCreativeMode("Creative")}>Creative</DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => setCreativeMode("Precise")}>Precise</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">
            <Check className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});
