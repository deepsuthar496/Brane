"use client";

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Send,
  Plus,
  ChevronDown,
  Sparkles,
  Shield,
  Settings,
  Search,
  Square
} from "lucide-react";
import { ProviderSettingsDialog } from "./provider-settings-dialog";

// ── Model Options ─────────────────────────────────────

const DEFAULT_MODELS: any[] = [];

// ── Prompt Bar Component ──────────────────────────────

interface PromptBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  suggestions?: string[];
  model: string;
  onModelChange: (model: string) => void;
  isThinking?: boolean;
  onStop?: () => void;
}

export function PromptBar({
  onSend,
  disabled = false,
  suggestions = [],
  model,
  onModelChange,
  isThinking,
  onStop,
}: PromptBarProps) {
  const [value, setValue] = useState("");
  const [showModels, setShowModels] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modelsList, setModelsList] = useState(DEFAULT_MODELS);
  const [searchModel, setSearchModel] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelsRef = useRef<HTMLDivElement>(null);

  const loadModels = useCallback(async () => {
    try {
      const registry = await window.electronAPI.getModelsRegistry();
      const credentials = await window.electronAPI.getAllCredentials();
      const customModelsRow = credentials.find((c: any) => c.envVar === "CUSTOM_MODELS_JSON");
      
      const newModels: any[] = [];
      const keysAvailable = credentials.map((c: any) => c.envVar);

      // Add Models.dev dynamically based on connected providers
      for (const providerId in registry) {
         const provider = registry[providerId];
         // Only include models if provider is configured, OR if it's one of the big 3 and we want them visible
         const hasKey = provider.env && provider.env.some((envKey: string) => keysAvailable.includes(envKey));
         
         if (hasKey && provider.models) {
             for (const mKey in provider.models) {
                const m = provider.models[mKey];
                newModels.push({
                   id: `${providerId}:${m.id}`,
                   label: m.name || m.id,
                   badge: provider.name,
                   providerId
                });
             }
         }
      }
      
      // Inject user custom specific models
      if (customModelsRow && customModelsRow.value) {
         try {
            const parsed = JSON.parse(customModelsRow.value);
            parsed.forEach((m: any) => {
               if (m.id && m.name) {
                 newModels.push({
                   id: `custom:${m.id}`,
                   label: m.name,
                   badge: "Local",
                   providerId: "custom"
                 });
               }
            });
         } catch (e) {
           console.error("Failed to inject custom models", e);
         }
      }
      setModelsList(newModels);
      
    } catch (e) {
      console.error("Failed to load models", e);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

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

  const currentModel = modelsList.find((m) => m.id === model) || modelsList[0] || { label: "Select Model" };

  const uniqueProviders = Array.from(
    new Map(modelsList.filter(m => m.providerId).map(m => [m.providerId, m.badge])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredModels = modelsList
    .filter(m => selectedProvider ? m.providerId === selectedProvider : true)
    .filter(m => m.label.toLowerCase().includes(searchModel.toLowerCase()) || m.id.toLowerCase().includes(searchModel.toLowerCase()));

  const groupedModels = filteredModels.reduce((acc, m) => {
    const key = m.providerId || 'other';
    if (!acc[key]) acc[key] = { name: m.badge || 'Other', models: [] };
    acc[key].models.push(m);
    return acc;
  }, {} as Record<string, { name: string, models: typeof filteredModels }>);

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

          {/* Stop / Send Button */}
          {isThinking ? (
            <button
              onClick={onStop}
              className="size-8 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 flex items-center justify-center transition-all shadow-sm"
              title="Stop Generation"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
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
          )}
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
            <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl border border-border/50 bg-popover shadow-xl shadow-black/40 z-50 flex flex-col max-h-[350px] animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
              <div className="p-2 border-b border-border/50 sticky top-0 bg-popover z-10 rounded-t-xl flex flex-col gap-2">
                 <div className="relative">
                   <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                   <input 
                     value={searchModel} 
                     onChange={e => setSearchModel(e.target.value)}
                     placeholder="Search models..."
                     className="w-full bg-surface-2 text-xs pl-8 pr-2 py-2 rounded focus:outline-none"
                   />
                 </div>
                 {uniqueProviders.length > 0 && (
                   <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                     <button
                       onClick={() => setSelectedProvider(null)}
                       className={cn(
                         "text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition-colors flex items-center justify-center h-6",
                         selectedProvider === null 
                           ? "bg-primary text-primary-foreground" 
                           : "bg-surface-2 text-muted-foreground hover:text-foreground"
                       )}
                     >
                       All
                     </button>
                     {uniqueProviders.map(provider => (
                       <button
                         key={provider.id}
                         onClick={() => setSelectedProvider(provider.id)}
                         title={provider.name}
                         className={cn(
                           "text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition-colors flex items-center justify-center h-6 min-w-6",
                           selectedProvider === provider.id
                             ? "bg-primary/20 text-primary" 
                             : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-2/80"
                         )}
                       >
                         {provider.id === 'custom' || provider.id === 'local' ? (
                           <span>{provider.name}</span>
                         ) : (
                           <img 
                             src={`https://models.dev/logos/${provider.id}.svg`} 
                             alt={provider.name} 
                             className="w-3.5 h-3.5 object-contain" 
                             onError={(e) => {
                               e.currentTarget.style.display = 'none';
                               if (e.currentTarget.nextElementSibling) {
                                 (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'inline';
                               }
                             }}
                           />
                         )}
                         {provider.id !== 'custom' && provider.id !== 'local' && (
                           <span className="hidden">{provider.name}</span>
                         )}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
              <div className="overflow-y-auto w-full py-1.5 flex-1">
                {filteredModels.length === 0 ? (
                   <div className="px-4 py-3 text-xs text-muted-foreground text-center">No models found</div>
                ) : (
                  Object.entries(groupedModels).map(([providerId, group]) => (
                    <div key={providerId} className="mb-3 last:mb-1">
                      <div className="px-3 py-1.5 flex items-center gap-2 mb-0.5">
                        {providerId === 'custom' || providerId === 'local' || providerId === 'other' ? (
                          <span className="text-[11px] font-semibold text-muted-foreground">{group.name}</span>
                        ) : (
                          <>
                            <img 
                              src={`https://models.dev/logos/${providerId}.svg`} 
                              alt={group.name} 
                              className="w-4 h-4 object-contain opacity-70" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'inline';
                                }
                              }}
                            />
                            <span className="text-[11px] font-semibold text-muted-foreground">{group.name}</span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col">
                        {group.models.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              onModelChange(m.id);
                              setShowModels(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-1.5 text-[13px] transition-colors",
                              model === m.id
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground hover:bg-surface-2"
                            )}
                          >
                            <span className="truncate font-medium">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
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

        {/* Settings icon */}
        <button 
           onClick={() => setShowSettings(true)}
           className="text-txt-4 hover:text-txt-2 transition-colors ml-auto mr-1"
           title="Configure Providers..."
        >
          <Settings className="size-3.5" />
        </button>
      </div>

      <ProviderSettingsDialog 
         open={showSettings} 
         onOpenChange={setShowSettings} 
         onModelsUpdate={loadModels} 
      />
    </div>
  );
}
