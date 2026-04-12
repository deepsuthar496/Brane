"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  ArrowLeft,
  Download,
  Copy,
  ShieldCheck,
  Package,
  Terminal,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillEntry, SkillDetail as SkillDetailType, getRegistryUrls } from "@/lib/registry";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SkillDetailProps {
  skill: SkillEntry;
  isInstalled: boolean;
  onInstall?: (skill: SkillEntry) => Promise<void>;
  onClose?: () => void;
  registryRepo: string;
}

export function SkillDetail({ skill, isInstalled, onInstall, onClose, registryRepo }: SkillDetailProps) {
  const [installing, setInstalling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SkillDetailType | null>(null);

  const registryUrls = getRegistryUrls(registryRepo);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!window.electronAPI) return;
      setLoading(true);
      try {
        const cat = skill.path.split('/')[2] || 'general';
        const urlPair = registryUrls.skillMeta(cat, skill.id);
        const data = await window.electronAPI.fetchRegistryData<SkillDetailType>(urlPair);
        setDetail(data);
      } catch (e) {
        console.error("Failed to fetch skill details", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [skill.id, skill.path, registryRepo]);

  const handleInstall = async () => {
    if (isInstalled || installing || !onInstall) return;
    setInstalling(true);
    try {
      await onInstall(skill);
    } finally {
      setInstalling(false);
    }
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(`brane skill add ${skill.id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="size-8 animate-spin text-primary/50" />
        <p className="text-sm text-txt-3">Loading skill details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Header / Nav */}
      <div className="flex items-center gap-4 px-8 py-4 border-b border-border shrink-0 bg-surface-1/50">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="h-8 px-2 gap-1.5 text-txt-3 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Skills
        </Button>
        <Separator orientation="vertical" className="h-4 bg-border" />
        <div className="text-[13px] font-medium text-txt-2 truncate flex items-center gap-2">
          <span className="opacity-50">Skill</span>
          <span className="text-border">/</span>
          {skill.name}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-8 py-12">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* Left Content Column */}
            <div className="md:col-span-2 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-3xl shadow-sm">
                    {skill.icon || "📦"}
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">
                      {skill.name}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-txt-3">
                      <span>by <span className="text-foreground font-medium">{skill.author}</span></span>
                      <span className="opacity-30">•</span>
                      <span>v{skill.version}</span>
                    </div>
                  </div>
                </div>

                <p className="text-lg text-txt-2 leading-relaxed">
                  {skill.description}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  {skill.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-0.5 rounded-full bg-surface-2 border border-border text-[11px] text-txt-3 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/60" />

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">About this Skill</h3>
                <div className="prose prose-invert prose-sm max-w-none bg-surface-2/30 rounded-xl p-8 border border-border/50">
                  <p className="text-[15px] leading-relaxed text-txt-2 whitespace-pre-wrap">
                    {detail?.readme || "No detailed documentation available for this skill."}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Action Column */}
            <div className="space-y-6">
              <div className="p-6 bg-surface-1 border border-border rounded-2xl space-y-6 shadow-sm">
                <div className="space-y-4">
                  <Button 
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
                    onClick={handleInstall}
                    disabled={isInstalled || installing}
                  >
                    {installing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    {isInstalled ? "Installed" : "Install Skill"}
                  </Button>
                  
                  {isInstalled && (
                    <div className="flex items-center justify-center gap-2 py-1 text-[13px] text-green-500 font-medium">
                      <ShieldCheck className="size-4" />
                      Ready to use
                    </div>
                  )}
                </div>

                <Separator className="bg-border/60" />

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-txt-4 uppercase tracking-widest">CLI Command</label>
                  <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border font-mono text-[12px] group">
                    <span className="flex-1 text-txt-2 truncate">brane add {skill.id}</span>
                    <button 
                      onClick={copyCommand}
                      className="p-1.5 hover:bg-surface-2 rounded-md transition-colors text-txt-3 hover:text-foreground"
                      title="Copy command"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-txt-4">License</span>
                    <span className="text-txt-2 font-medium uppercase">{skill.license}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-txt-4">Size</span>
                    <span className="text-txt-2 font-medium">{detail?.size || "Unknown"}</span>
                  </div>
                </div>
              </div>

              {skill.compatibleAgents.length > 0 && (
                <div className="p-6 bg-surface-2/30 border border-border/50 rounded-2xl space-y-4">
                  <h4 className="text-[11px] font-bold text-txt-4 uppercase tracking-widest">Compatibility</h4>
                  <div className="flex flex-wrap gap-2">
                    {skill.compatibleAgents.map(agent => (
                      <div key={agent} className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border text-[12px] text-txt-2">
                        <Package className="size-3 text-primary/70" />
                        {agent}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
