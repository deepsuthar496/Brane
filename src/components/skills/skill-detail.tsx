"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  Star, 
  Users, 
  ExternalLink,
  ShieldCheck,
  Download,
  Copy,
  Terminal,
  ChevronRight,
  BookOpen,
  HelpCircle,
  FileCode,
  Share2,
  XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillEntry, SkillDetail as SkillDetailType, getRegistryUrls } from "@/lib/registry";
import { 
  SheetContent,
  SheetClose
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        const urlPair = registryUrls.skillMeta(skill.id.split('-')[0] || 'general', skill.id);
        const data = await window.electronAPI.fetchRegistryData<SkillDetailType>(urlPair);
        setDetail(data);
      } catch (e) {
        console.error("Failed to fetch skill details", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [skill.id, registryRepo]);

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
    navigator.clipboard.writeText(`brane install skill ${skill.id}`);
  };

  return (
    <SheetContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col h-full bg-background border-l border-border shadow-2xl">
      <ScrollArea className="flex-1">
        <div className="p-10 relative">
          
          <SheetClose className="absolute top-6 right-6 text-txt-4 hover:text-foreground hover:bg-surface-2 transition-colors rounded-sm opacity-70 ring-offset-background data-[state=open]:bg-secondary">
            <XIcon className="size-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          {/* Main Title Area */}
          <div className="mb-12">
            <h1 className="text-[48px] font-bold text-foreground tracking-tight leading-none mb-4">
              {skill.name}
            </h1>
            <div className="flex items-center gap-4 text-txt-3 text-[13px]">
              <div className="flex items-center gap-1.5">
                <div className="size-5 rounded bg-surface-3 border border-border flex items-center justify-center text-primary">
                  <Terminal className="size-3" />
                </div>
                <span>by <span className="text-foreground font-bold">{skill.author}</span></span>
              </div>
              <span className="opacity-20">•</span>
              <div className="flex items-center gap-1.5 bg-surface-2 px-2 py-0.5 rounded border border-border/60">
                <Star className="size-3 text-primary" />
                <span className="text-foreground font-mono">330,129</span>
              </div>
              <span className="opacity-20">•</span>
              <div className="flex items-center gap-3">
                <Terminal className="size-3.5 hover:text-foreground cursor-pointer transition-colors" />
                <Share2 className="size-3.5 hover:text-foreground cursor-pointer transition-colors" />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
               <div className="inline-block px-2.5 py-0.5 rounded bg-surface-3 border border-border/60 text-[10px] text-txt-3 font-bold uppercase tracking-widest">
                {skill.tags[0] || "General"}
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold uppercase tracking-widest">
                v{skill.version}
              </div>
            </div>

            <p className="mt-8 text-[18px] text-txt-2 max-w-2xl leading-relaxed">
              {skill.description}
            </p>
          </div>

          <Separator className="bg-border/60 mb-12" />

          {/* Grid Layout: Main Content + Sidebar */}
          <div className="grid grid-cols-12 gap-12">
            
            {/* Left Column: About/Manifest */}
            <div className="col-span-8 space-y-12">
              <Tabs defaultValue="about" className="w-full">
                <TabsList className="bg-transparent border-b border-border/60 w-full justify-start rounded-none h-auto p-0 gap-10 mb-8">
                  <TabsTrigger 
                    value="about" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4 text-[14px] font-bold uppercase tracking-widest text-txt-4 data-[state=active]:text-primary transition-colors"
                  >
                    About
                  </TabsTrigger>
                  <TabsTrigger 
                    value="manifest" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4 text-[14px] font-bold uppercase tracking-widest text-txt-4 data-[state=active]:text-primary transition-colors"
                  >
                    SKILL.md
                  </TabsTrigger>
                  <TabsTrigger 
                    value="faq" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-4 text-[14px] font-bold uppercase tracking-widest text-txt-4 data-[state=active]:text-primary transition-colors"
                  >
                    FAQ
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="space-y-12 focus-visible:ring-0">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-[16px] leading-relaxed text-txt-2 opacity-90">
                      {detail?.readme || "This skill provides advanced automation for your agent workflow. It enables direct integration with various development tools and enhances the agent's ability to reason about complex project structures."}
                    </p>
                  </div>

                  {/* Key Features Section */}
                  <section>
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-widest mb-6 pb-2 border-b border-primary/10">Key Features</h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex gap-4 group">
                          <span className="text-[12px] font-mono text-primary/30 pt-1 group-hover:text-primary transition-colors">0{i}</span>
                          <p className="text-[14px] text-txt-3 leading-snug">
                            {i === 1 && "Automated formatting and linting checks"}
                            {i === 2 && "Integration with various dev tools"}
                            {i === 3 && "Real-time status updates from terminal"}
                            {i === 4 && "Support for complex project structures"}
                            {i === 5 && "Enhanced reasoning capabilities"}
                            {i > 5 && "Pre-configured templates for common tasks"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Use Cases Section */}
                  <section>
                    <h3 className="text-[14px] font-bold text-primary uppercase tracking-widest mb-6 pb-2 border-b border-primary/10">Use Cases</h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4 group">
                          <span className="text-[12px] font-mono text-primary/30 pt-1 group-hover:text-primary transition-colors">0{i}</span>
                          <p className="text-[14px] text-txt-3 leading-snug">
                            {i === 1 && "Standardizing codebase appearance across teams"}
                            {i === 2 && "Preparing code for pull request submission"}
                            {i === 3 && "Resolving CI pipeline failures quickly"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="manifest" className="focus-visible:ring-0">
                  <div className="bg-surface-2 rounded border border-border p-6 font-mono text-[13px] text-txt-2 overflow-x-auto shadow-inner">
                    <pre className="opacity-80">{`name: ${skill.name}\ndescription: ${skill.description}\nauthor: ${skill.author}\nversion: ${skill.version}\n\n# Manifest content loading...`}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="faq" className="focus-visible:ring-0">
                  <div className="p-10 text-center border border-dashed border-border rounded-xl">
                    <HelpCircle className="size-8 text-txt-4 mx-auto mb-4" />
                    <p className="text-txt-4 text-[14px]">No FAQ items found for this skill.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column: Sidebar */}
            <div className="col-span-4 space-y-8">
              {/* Security Banner */}
              <div className="relative group overflow-hidden px-4 py-3 rounded bg-surface-2 border border-border flex items-center justify-center gap-3 transition-colors hover:bg-surface-3">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <div className="flex gap-1">
                   <ChevronRight className="size-3 text-txt-4 rotate-180" />
                   <ChevronRight className="size-3 text-txt-4 rotate-180" />
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-foreground" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Security Scan</span>
                </div>
                <div className="flex gap-1">
                   <ChevronRight className="size-3 text-txt-4" />
                   <ChevronRight className="size-3 text-txt-4" />
                </div>
              </div>

              {/* Install Card */}
              <div className="p-8 bg-surface-2 border border-border rounded shadow-sm space-y-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-[12px] font-medium text-txt-4">Install with</span>
                  <div className="flex items-center gap-1.5 font-bold text-[14px] text-foreground">
                    <div className="size-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]">⚡</div>
                    Skill.Fish
                  </div>
                </div>

                <div className="relative flex items-center group">
                  <div className="flex-1 bg-background border border-border rounded-l px-4 py-2.5 text-[13px] font-mono text-txt-2 truncate text-left shadow-inner">
                    brane skill add {skill.id}
                  </div>
                  <button 
                    onClick={copyCommand}
                    className="bg-surface-3 border-y border-r border-border rounded-r px-4 py-2.5 hover:bg-surface-1 transition-colors group/btn active:scale-95"
                  >
                    <Copy className="size-4 text-txt-3 group-hover/btn:text-foreground" />
                  </button>
                </div>

                <div className="pt-6 border-t border-border/60 space-y-4">
                   <span className="text-[12px] text-txt-4 block italic">For use in Gemini CLI</span>
                   <Button 
                    className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-[12px] font-bold uppercase tracking-widest gap-2 shadow-lg shadow-primary/10"
                    onClick={handleInstall}
                    disabled={isInstalled || installing}
                   >
                     {installing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                     {isInstalled ? "Downloaded" : "Download Skill"}
                   </Button>
                </div>
              </div>

              {/* Related Skills */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-txt-4">Related Skills</h4>
                  <button className="text-[10px] text-primary hover:underline uppercase tracking-widest">View More</button>
                </div>
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="p-4 bg-surface-1 hover:bg-surface-2 border border-border/40 rounded transition-all cursor-pointer group/item shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="size-5 rounded bg-surface-3 flex items-center justify-center text-[11px]">📁</div>
                        <span className="text-[12px] font-bold text-foreground uppercase group-hover/item:text-primary transition-colors">GH Issues Auto-Fixer</span>
                      </div>
                      <p className="text-[11px] text-txt-4 line-clamp-2 leading-relaxed font-sans">
                        Automates the end-to-end GitHub issue lifecycle by spawning sub-agents...
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      </ScrollArea>
    </SheetContent>
  );
}
