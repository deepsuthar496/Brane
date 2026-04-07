"use client";

import { useState, useEffect, useRef } from "react";
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
  Check,
  Loader2,
  AlertCircle
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
    commandName: "claude",
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
        id: "npm",
        os: "NPM (Global)",
        icon: "logos:npm-icon",
        command: "npm install -g @anthropic-ai/claude-code",
        platformMatch: ["any"]
      },
      {
        id: "macos-linux",
        os: "MacOS / Linux (Script)",
        icon: "ph:terminal-fill", 
        command: "curl -fsSL https://claude.ai/install.sh | bash",
        platformMatch: ["mac", "linux"]
      },
      {
        id: "homebrew",
        os: "Homebrew",
        icon: "devicon:homebrew",
        command: "brew install --cask claude-code",
        platformMatch: ["mac"]
      }
    ]
  },
  {
    id: "aider",
    name: "Aider",
    commandName: "aider",
    developer: "aider.chat",
    icon: "ph:rocket-launch-bold",
    description: "Aider is a command-line chat tool that allows you to write code with LLMs. You can start a new project or work on an existing repo. Aider works best with GPT-4o & Claude 3.5 Sonnet and can connect to almost any LLM.",
    shortDescription: "AI pair programming in your terminal.",
    downloads: "500k+",
    rating: "4.8",
    lastUpdate: "Nov 2, 2023",
    size: "12 MB",
    installOptions: [
      {
        id: "pip",
        os: "Python (Pip)",
        icon: "logos:python",
        command: "pip install aider-chat",
        platformMatch: ["any"]
      }
    ]
  },
  {
    id: "ollama",
    name: "Ollama",
    commandName: "ollama",
    developer: "Ollama",
    icon: "ph:cloud-sun-bold",
    description: "Get up and running with large language models locally. Run Llama 3, Mistral, Gemma, and other models on your machine.",
    shortDescription: "Run large language models locally.",
    downloads: "2M+",
    rating: "4.9",
    lastUpdate: "Nov 5, 2023",
    size: "480 MB",
    installOptions: [
      {
        id: "macos",
        os: "MacOS",
        icon: "logos:apple",
        command: "brew install ollama",
        platformMatch: ["mac"]
      },
      {
        id: "linux",
        os: "Linux",
        icon: "logos:linux-tux",
        command: "curl -fsSL https://ollama.com/install.sh | sh",
        platformMatch: ["linux"]
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
  
  // Installation states
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [isInstalled, setIsInstalled] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

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
      // Check if already installed
      if (window.electronAPI) {
        window.electronAPI.checkCLIInstalled(selectedAgent.commandName).then(setIsInstalled);
      }

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

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [installLogs]);

  const filteredAgents = storeAgents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstall = async () => {
    if (!selectedAgent || !selectedInstallOption) return;
    
    setIsInstalling(true);
    setInstallLogs([`Starting installation of ${selectedAgent.name}...`]);
    
    if (!window.electronAPI) {
      setInstallLogs(prev => [...prev, "Error: Electron API not found. Installation requires Brane Hub desktop app."]);
      setIsInstalling(false);
      return;
    }

    const cleanup = window.electronAPI.onInstallProgress(selectedAgent.id, (payload: any) => {
      setInstallLogs(prev => [...prev, payload.data]);
    });

    try {
      const result = await window.electronAPI.installCLI({
        command: selectedInstallOption.command,
        id: selectedAgent.id
      });

      if (result.success) {
        setInstallLogs(prev => [...prev, "\nInstallation completed successfully!"]);
        setIsInstalled(true);
      } else {
        setInstallLogs(prev => [...prev, `\nInstallation failed with code ${result.code}. ${result.error || ""}`]);
      }
    } catch (err: any) {
      setInstallLogs(prev => [...prev, `\nError: ${err.message}`]);
    } finally {
      setIsInstalling(false);
      cleanup();
    }
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {filteredAgents.map((agent) => (
                    <div 
                      key={agent.id}
                      className="group flex flex-col p-6 rounded-2xl bg-surface-1 border border-border/40 hover:border-primary/40 hover:bg-surface-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="size-14 rounded-2xl bg-background border border-border/60 flex items-center justify-center text-[28px] shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300 text-primary">
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
                          className="h-8 px-4 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary text-black hover:bg-primary/90 transition-colors"
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
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mb-8 text-txt-3 hover:text-foreground -ml-2 gap-2"
                  onClick={() => {
                    setSelectedAgent(null);
                    setInstallLogs([]);
                    setIsInstalling(false);
                  }}
                >
                  <ArrowLeft className="size-4" />
                  Back to Store
                </Button>

                {/* Hero Section */}
                <div className="flex flex-col md:flex-row gap-10 items-start mb-12">
                  <div className="size-32 md:size-40 rounded-[32px] bg-surface-1 border border-border/40 flex items-center justify-center text-[72px] shrink-0 shadow-xl text-primary">
                    <Icon icon={selectedAgent.icon} />
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-2">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-[40px] md:text-[56px] font-bold text-foreground tracking-tight leading-none">
                        {selectedAgent.name}
                      </h1>
                      {isInstalled && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-agent-green-dim border border-agent-green/20 rounded-full">
                           <ShieldCheck className="size-4 text-agent-green" />
                           <span className="text-[12px] font-bold text-agent-green uppercase tracking-wider">Installed</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[18px] text-primary font-bold tracking-tight mb-8">
                      {selectedAgent.developer}
                    </p>
                    
                    <div className="flex items-center gap-8 text-txt-3 text-[14px] mb-10">
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

                    <div className="flex items-center gap-4">
                       {isInstalled ? (
                         <Button 
                           disabled
                           className="h-12 px-10 rounded-xl bg-surface-2 text-txt-3 border border-border/60 text-[15px] font-bold"
                         >
                           Installed
                         </Button>
                       ) : (
                         <Button 
                           onClick={handleInstall}
                           disabled={isInstalling}
                           className="h-12 px-10 rounded-xl bg-primary text-black hover:bg-primary/90 text-[15px] font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                         >
                           {isInstalling ? (
                             <><Loader2 className="size-5 animate-spin mr-2" /> Installing...</>
                           ) : (
                             <><Download className="size-5 mr-2" /> Install Now</>
                           )}
                         </Button>
                       )}
                       {!isInstalling && !isInstalled && (
                         <div className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border/40 rounded-xl text-txt-3">
                            <ShieldCheck className="size-4 text-agent-green" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">One-Click Install</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 xl:gap-20">
                  {/* Left Column: Description & Info */}
                  <div className="lg:col-span-2 space-y-10">
                    {/* Installation Terminal (if installing or finished) */}
                    {(isInstalling || installLogs.length > 0) && (
                      <section className="animate-in zoom-in-95 duration-300">
                        <div className="bg-[#0c0c0b] rounded-2xl border border-border/40 overflow-hidden shadow-2xl">
                          <div className="bg-surface-2 px-4 py-2 border-b border-border/40 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <Terminal className="size-3.5 text-txt-3" />
                               <span className="text-[11px] font-bold text-txt-3 uppercase tracking-widest">Installation Terminal</span>
                             </div>
                             <div className="flex gap-1.5">
                                <div className="size-2 rounded-full bg-agent-red/30" />
                                <div className="size-2 rounded-full bg-agent-yellow/30" />
                                <div className="size-2 rounded-full bg-agent-green/30" />
                             </div>
                          </div>
                          <div className="p-4 h-[250px] overflow-y-auto font-mono text-[13px] space-y-1 scrollbar-thin">
                            {installLogs.map((log, i) => (
                              <div key={i} className={cn(
                                "break-all",
                                log.includes("Error") ? "text-agent-red" : "text-txt-2"
                              )}>
                                <span className="text-txt-4 mr-2">›</span>{log}
                              </div>
                            ))}
                            {isInstalling && (
                              <div className="flex items-center gap-2 text-primary animate-pulse">
                                <span className="text-txt-4 mr-2">›</span> 
                                <span className="w-2 h-4 bg-primary inline-block" />
                              </div>
                            )}
                            <div ref={logEndRef} />
                          </div>
                        </div>
                      </section>
                    )}

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

                  {/* Right Column: Install Options & Info */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-6">
                      <div className="bg-surface-1 border border-border/60 rounded-3xl p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-6">
                          <Terminal className="size-5 text-primary" />
                          <h3 className="text-[18px] font-bold text-foreground">Install Options</h3>
                        </div>

                        {/* OS Selection Tabs */}
                        <div className="flex flex-col gap-2">
                          {selectedAgent.installOptions.map((opt) => {
                            const isRecommended = opt.platformMatch.includes(userPlatform) || opt.platformMatch.includes("any");
                            
                            return (
                              <button
                                key={opt.id}
                                disabled={isInstalling}
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

                        {/* Command Display (Optional collapse or smaller) */}
                        <div className="mt-6 pt-6 border-t border-border/40">
                           <div className="flex items-center justify-between mb-2 px-1">
                             <span className="text-[10px] font-bold text-txt-4 uppercase tracking-widest">Manual Command</span>
                             <button 
                                onClick={() => handleCopy(selectedInstallOption?.command || "")}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest hover:opacity-80 transition-opacity"
                              >
                                {copied ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
                              </button>
                           </div>
                           <div className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-[11px] font-mono text-txt-3 break-all line-clamp-2">
                              {selectedInstallOption?.command}
                           </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-3xl bg-surface-2/50 border border-border/40 space-y-3">
                         <div className="flex items-center gap-2 text-foreground">
                            <ShieldCheck className="size-4 text-agent-green" />
                            <span className="text-[13px] font-bold tracking-tight">Verified Installation</span>
                         </div>
                         <p className="text-[12px] text-txt-3 leading-relaxed">
                           Brane Hub manages the installation process securely and will automatically link the CLI to your workspace upon completion.
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
