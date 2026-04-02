"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Search, 
  Download, 
  Star, 
  Info, 
  Calendar, 
  DownloadCloud, 
  Terminal,
  ShieldCheck,
  ChevronRight,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Icon } from '@iconify/react';
import { cn } from "@/lib/utils";

// Mock Data
const storeAgents = [
  {
    id: "claude-code",
    name: "Claude Code",
    developer: "Anthropic",
    icon: "material-icon-theme:claude",
    description: "Claude Code is an agentic coding companion that lives in your terminal, understands your codebase, and helps you code faster by executing routine tasks, explaining complex logic, and writing boilerplate. It seamlessly integrates with your existing workflow, allowing you to stay focused without leaving your command line environment.",
    shortDescription: "Agentic coding companion in your terminal by Anthropic.",
    downloads: "1.2M+",
    rating: "4.9",
    lastUpdate: "Oct 24, 2023",
    size: "45 MB",
    installOptions: [
      {
        id: "macos-linux",
        os: "MacOS / Linux",
        icon: "ph:terminal-fill", 
        command: "curl -fsSL https://claude.ai/install.sh | bash",
        platformMatch: ["mac", "linux"]
      },
      {
        id: "windows",
        os: "Windows",
        icon: "material-symbols:window",
        command: "irm https://claude.ai/install.ps1 | iex",
        platformMatch: ["win"]
      },
      {
        id: "homebrew",
        os: "Homebrew",
        icon: "devicon:homebrew",
        command: "brew install --cask claude-code",
        platformMatch: ["mac"] // Homebrew primarily macOS in this context
      },
      {
        id: "npm",
        os: "NPM",
        icon: "logos:npm-icon",
        command: "npm install -g @anthropic-ai/claude-code",
        platformMatch: ["any"]
      }
    ]
  }
];

export default function StorePage() {
  const [selectedAgent, setSelectedAgent] = useState<typeof storeAgents[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstallId, setSelectedInstallId] = useState("");
  const [copied, setCopied] = useState(false);
  const [userPlatform, setUserPlatform] = useState<string>("unknown");

  useEffect(() => {
    // Detect OS
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("win")) setUserPlatform("win");
      else if (ua.includes("mac")) setUserPlatform("mac");
      else if (ua.includes("linux")) setUserPlatform("linux");
      else setUserPlatform("any");
    }
  }, []);

  useEffect(() => {
    if (selectedAgent && userPlatform !== "unknown") {
      // Find best default installer for current OS
      const bestMatch = selectedAgent.installOptions.find(opt => 
        opt.platformMatch.includes(userPlatform) || opt.platformMatch.includes("any")
      );
      if (bestMatch) {
        setSelectedInstallId(bestMatch.id);
      } else {
        setSelectedInstallId(selectedAgent.installOptions[0].id);
      }
    }
  }, [selectedAgent, userPlatform]);

  const filteredAgents = storeAgents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedInstallOption = selectedAgent?.installOptions.find(opt => opt.id === selectedInstallId) || selectedAgent?.installOptions[0];

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={selectedAgent ? ["Workspace", "Agent Store", selectedAgent.name] : ["Workspace", "Agent Store"]}
            title="Agent Store"
            subtitle="Discover and install powerful AI CLIs and coding agents"
          />

          {/* Reduced horizontal padding from p-8 to px-8 py-6, removed max-w constraints */}
          <div className="flex-1 overflow-y-auto bg-background px-8 py-6">
            {!selectedAgent ? (
              // --- LIST VIEW ---
              <div className="w-full space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-[20px] font-bold text-foreground tracking-tight">Featured Agents</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-txt-4" />
                    <Input 
                      placeholder="Search store..." 
                      className="pl-9 h-9 text-[13px] bg-surface-2/50 border-border/40 focus-visible:ring-primary/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Adjusted grid to span full width nicely */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {filteredAgents.map((agent) => (
                    <div 
                      key={agent.id}
                      className="group flex flex-col p-6 rounded-2xl bg-surface-1 border border-border/40 hover:border-primary/40 hover:bg-surface-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="size-14 rounded-2xl bg-background border border-border/60 flex items-center justify-center text-[28px] shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                          <Icon icon={agent.icon} />
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <h3 className="text-[18px] font-bold text-foreground leading-snug truncate">
                          {agent.name}
                        </h3>
                        <p className="text-[13px] text-primary font-semibold truncate mb-2">
                          {agent.developer}
                        </p>
                        <p className="text-[13px] text-txt-3 leading-relaxed line-clamp-2 min-h-[40px]">
                          {agent.shortDescription}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between pt-4 border-t border-border/40">
                        <div className="flex items-center gap-1">
                          <span className="text-[12px] font-bold text-foreground">{agent.rating}</span>
                          <Star className="size-3 text-foreground fill-foreground" />
                        </div>
                        <Button 
                          size="sm" 
                          className="h-8 px-4 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary hover:text-black transition-colors"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredAgents.length === 0 && (
                    <div className="col-span-full py-20 text-center text-txt-4">
                      No agents found matching your search.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // --- DETAIL VIEW ---
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mb-8 text-txt-3 hover:text-foreground -ml-2 gap-2"
                  onClick={() => setSelectedAgent(null)}
                >
                  <ArrowLeft className="size-4" />
                  Back to Store
                </Button>

                {/* Hero Section */}
                <div className="flex flex-col md:flex-row gap-10 items-start mb-12">
                  <div className="size-32 md:size-40 rounded-[32px] bg-surface-1 border border-border/40 flex items-center justify-center text-[72px] shrink-0 shadow-xl">
                    <Icon icon={selectedAgent.icon} />
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-2">
                    <h1 className="text-[40px] md:text-[56px] font-bold text-foreground tracking-tight leading-none mb-3">
                      {selectedAgent.name}
                    </h1>
                    <p className="text-[18px] text-primary font-bold tracking-tight mb-6">
                      {selectedAgent.developer}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-6 text-txt-3 text-[14px]">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          {selectedAgent.rating} <Star className="size-4 fill-foreground" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-txt-4">Rating</span>
                      </div>
                      <div className="h-8 w-px bg-border/60" />
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          {selectedAgent.downloads} <DownloadCloud className="size-4" />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-txt-4">Downloads</span>
                      </div>
                      <div className="h-8 w-px bg-border/60" />
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          {selectedAgent.size}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-txt-4">Size</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 xl:gap-20">
                  {/* Left Column: Description & Info */}
                  <div className="lg:col-span-2 space-y-10">
                    <section>
                      <h3 className="text-[18px] font-bold text-foreground mb-4">About this Agent</h3>
                      <p className="text-[16px] text-txt-2 leading-relaxed opacity-90">
                        {selectedAgent.description}
                      </p>
                    </section>

                    <section className="bg-surface-1/50 rounded-3xl p-6 border border-border/40 max-w-2xl">
                      <h3 className="text-[14px] font-bold text-txt-4 uppercase tracking-widest mb-4">Information</h3>
                      <div className="grid grid-cols-2 gap-y-4">
                        <div>
                          <span className="text-[12px] text-txt-4 block mb-1">Developer</span>
                          <span className="text-[14px] font-semibold text-foreground">{selectedAgent.developer}</span>
                        </div>
                        <div>
                          <span className="text-[12px] text-txt-4 block mb-1">Last Updated</span>
                          <span className="text-[14px] font-semibold text-foreground">{selectedAgent.lastUpdate}</span>
                        </div>
                        <div>
                          <span className="text-[12px] text-txt-4 block mb-1">Category</span>
                          <span className="text-[14px] font-semibold text-foreground">Coding Companion</span>
                        </div>
                        <div>
                          <span className="text-[12px] text-txt-4 block mb-1">License</span>
                          <span className="text-[14px] font-semibold text-foreground">Proprietary</span>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Install Action */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-8 bg-surface-1 border border-border/60 rounded-3xl p-6 shadow-lg">
                      <div className="flex items-center gap-2 mb-6">
                        <Download className="size-5 text-primary" />
                        <h3 className="text-[18px] font-bold text-foreground">Install</h3>
                      </div>

                      {/* OS Selection Tabs */}
                      <div className="flex flex-col gap-2 mb-6">
                        {selectedAgent.installOptions.map((opt) => {
                          const isRecommended = opt.platformMatch.includes(userPlatform) || opt.platformMatch.includes("any");
                          
                          return (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedInstallId(opt.id)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all border text-left",
                                selectedInstallId === opt.id
                                  ? "bg-primary/10 border-primary/30 text-foreground"
                                  : isRecommended 
                                    ? "bg-background border-border/40 text-txt-3 hover:bg-surface-2 hover:text-foreground hover:border-border"
                                    : "bg-background/50 border-transparent text-txt-4 opacity-50 hover:opacity-100 hover:bg-surface-2 transition-opacity"
                              )}
                            >
                              <Icon icon={opt.icon} className={cn("size-5 shrink-0", selectedInstallId === opt.id ? "text-primary" : "")} />
                              <div className="flex-1 flex flex-col">
                                <span className="text-[14px] font-semibold">{opt.os}</span>
                              </div>
                              {selectedInstallId === opt.id && (
                                <Check className="size-4 text-primary shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Command Display */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                          <span className="text-[12px] font-medium text-txt-4 uppercase tracking-wider">Run Command</span>
                          {selectedInstallOption && !selectedInstallOption.platformMatch.includes(userPlatform) && !selectedInstallOption.platformMatch.includes("any") && userPlatform !== "unknown" && (
                            <span className="text-[10px] text-agent-red bg-agent-red-dim px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                              May not run on your OS
                            </span>
                          )}
                        </div>
                        <div className="relative group">
                          <div className="w-full bg-background border border-border/60 rounded-xl px-4 py-3.5 text-[13px] font-mono text-txt-2 text-left shadow-inner break-all pr-12">
                            {selectedInstallOption?.command}
                          </div>
                          <button 
                            onClick={() => handleCopy(selectedInstallOption?.command || "")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors text-txt-4 hover:text-foreground"
                            title="Copy command"
                          >
                            {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-surface-2/50 border border-border/40">
                        <Info className="size-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[12px] text-txt-3 leading-relaxed">
                          Installing this CLI will make it available globally on your system. Brane Hub will automatically detect it once installed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
