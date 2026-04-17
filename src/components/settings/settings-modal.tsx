"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Settings as SettingsIcon,
  Check,
  Loader2,
  X,
  RefreshCw,
  Download,
  AlertCircle,
  Keyboard,
  Cpu,
  Monitor,
  Sparkles,
  Search,
  ShieldCheck,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabCategory = "General" | "Shortcuts" | "Providers" | "Models";

const NavItem = ({ 
  id, 
  label, 
  icon: Icon, 
  activeTab, 
  setActiveTab 
}: { 
  id: TabCategory; 
  label: string; 
  icon: LucideIcon; 
  activeTab: TabCategory; 
  setActiveTab: (id: TabCategory) => void;
}) => (
  <button
    onClick={() => setActiveTab(id)}
    className={cn(
      "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 group",
      activeTab === id 
        ? "bg-white/10 text-white shadow-sm" 
        : "text-white/40 hover:text-white/70 hover:bg-white/5"
    )}
  >
    <Icon className={cn("size-[14px] transition-colors", activeTab === id ? "text-primary" : "text-white/30 group-hover:text-white/50")} />
    {label}
  </button>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="text-[11px] font-semibold text-white/20 mb-2 px-3 uppercase tracking-wider mt-6 first:mt-0">{title}</div>
);

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabCategory>("General");
  
  // Settings State
  const [registryRepo, setRegistryRepo] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isSavingRepo, setIsSavingRepo] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [repoSaved, setRepoSaved] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);

  // Update State
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "downloading" | "ready" | "error" | "latest">("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;

    const unsubs = [
      window.electronAPI.onUpdateAvailable(() => {
        setUpdateStatus("available");
      }),
      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateStatus("latest");
        setTimeout(() => setUpdateStatus("idle"), 3000);
      }),
      window.electronAPI.onUpdateDownloadProgress((percent) => {
        setUpdateStatus("downloading");
        setDownloadProgress(percent);
      }),
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateStatus("ready");
      }),
      window.electronAPI.onUpdateError((err) => {
        setErrorMessage(err);
        setUpdateStatus("error");
      })
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleCheckForUpdates = async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    setUpdateStatus("checking");
    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      setUpdateStatus("error");
      setErrorMessage("Failed to start update check");
    }
  };

  const handleRestart = () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    window.electronAPI.restartAndInstall();
  };

  useEffect(() => {
    if (isOpen) {
      async function loadConfig() {
        if (typeof window !== "undefined" && window.electronAPI) {
          const [token, repo] = await Promise.all([
            window.electronAPI.getGithubToken(),
            window.electronAPI.getRegistryRepo()
          ]);
          setGithubToken(token || "");
          setRegistryRepo(repo || "deepsuthar496/Brane");
        }
      }
      loadConfig();
    }
  }, [isOpen]);

  const handleSaveRepo = async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    setIsSavingRepo(true);
    setRepoSaved(false);
    try {
      const success = await window.electronAPI.setRegistryRepo(registryRepo);
      if (success) {
        setRepoSaved(true);
        setTimeout(() => setRepoSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save repo:", error);
    } finally {
      setIsSavingRepo(false);
    }
  };

  const handleSaveToken = async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    setIsSavingToken(true);
    setTokenSaved(false);
    try {
      const success = await window.electronAPI.setGithubToken(githubToken);
      if (success) {
        setTokenSaved(true);
        setTimeout(() => setTokenSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save token:", error);
    } finally {
      setIsSavingToken(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
      
      {/* Settings Modal Container */}
      <div className="w-full max-w-[840px] h-[580px] flex rounded-xl overflow-hidden shadow-2xl border border-white/5 bg-[#0f0f0f] relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors z-50 p-1 hover:bg-white/5 rounded-md"
        >
          <X className="size-4" />
        </button>

        {/* Sidebar */}
        <div className="w-[210px] bg-[#0a0a0a] flex flex-col pt-8 pb-6 px-3 border-r border-white/5 shrink-0">
          <SectionHeader title="Desktop" />
          <div className="space-y-0.5">
            <NavItem id="General" label="General" icon={SettingsIcon} activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="Shortcuts" label="Shortcuts" icon={Keyboard} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <SectionHeader title="Server" />
          <div className="space-y-0.5">
            <NavItem id="Providers" label="Providers" icon={Cpu} activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="Models" label="Models" icon={Sparkles} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <div className="mt-auto px-3">
            <div className="text-[11px] text-white/40 font-medium tracking-tight">Brane Hub Desktop</div>
            <div className="text-[10px] text-white/20 mt-0.5 font-mono">v0.1.0</div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-[#0f0f0f]">
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-[580px]">
              {activeTab === "General" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h2 className="text-[18px] font-semibold text-white mb-1">General</h2>
                    <p className="text-[13px] text-white/40 mb-6">Sound effects</p>
                    
                    <div className="space-y-0.5 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-white/90">Agent</div>
                          <div className="text-[11px] text-white/30">Play sound when the agent is complete or needs attention</div>
                        </div>
                        <Select defaultValue="staplebops-01">
                          <SelectTrigger className="h-8 w-[140px] bg-white/[0.03] border-white/10 text-[12px] text-white/70">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10 text-white/70">
                            <SelectItem value="staplebops-01">Staplebops 01</SelectItem>
                            <SelectItem value="staplebops-02">Staplebops 02</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Separator className="bg-white/5 mx-4 w-auto" />
                      <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-white/90">Permissions</div>
                          <div className="text-[11px] text-white/30">Play sound when a permission is required</div>
                        </div>
                        <Select defaultValue="staplebops-02">
                          <SelectTrigger className="h-8 w-[140px] bg-white/[0.03] border-white/10 text-[12px] text-white/70">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10 text-white/70">
                            <SelectItem value="staplebops-01">Staplebops 01</SelectItem>
                            <SelectItem value="staplebops-02">Staplebops 02</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Separator className="bg-white/5 mx-4 w-auto" />
                      <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-white/90">Errors</div>
                          <div className="text-[11px] text-white/30">Play sound when an error occurs</div>
                        </div>
                        <Select defaultValue="nope-03">
                          <SelectTrigger className="h-8 w-[140px] bg-white/[0.03] border-white/10 text-[12px] text-white/70">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10 text-white/70">
                            <SelectItem value="nope-03">Nope 03</SelectItem>
                            <SelectItem value="classic">Classic</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-[14px] font-semibold text-white/90 mb-4 tracking-tight">Updates</h2>
                    <div className="space-y-0.5 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-white/90">Check for updates on startup</div>
                          <div className="text-[11px] text-white/30">Automatically check for updates when Brane Hub launches</div>
                        </div>
                        <Switch className="data-[state=checked]:bg-primary" />
                      </div>
                      <Separator className="bg-white/5 mx-4 w-auto" />
                      <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-white/90">Release notes</div>
                          <div className="text-[11px] text-white/30">Show What&apos;s New popups after updates</div>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                      </div>
                      <Separator className="bg-white/5 mx-4 w-auto" />
                      <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-white/90">Check for updates</div>
                          <div className="text-[11px] text-white/30">Manually check for updates and install if available</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {updateStatus === "ready" ? (
                            <Button size="sm" onClick={handleRestart} className="h-7 bg-agent-green hover:bg-agent-green/90 text-black font-bold text-[11px] px-4 rounded-lg">
                              Install Now
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              onClick={handleCheckForUpdates}
                              disabled={updateStatus === "checking" || updateStatus === "downloading"}
                              className="h-7 bg-white/5 hover:bg-white/10 text-white/80 border-white/5 text-[11px] px-4 rounded-lg"
                            >
                              {updateStatus === "checking" ? <Loader2 className="size-3 animate-spin mr-2" /> : null}
                              {updateStatus === "checking" ? "Checking..." : "Check now"}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {updateStatus === "downloading" && (
                        <div className="px-4 pb-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex justify-between text-[10px] mb-1.5 px-0.5">
                            <span className="text-white/40 italic">Downloading v0.1.1...</span>
                            <span className="text-primary/70 font-mono">{Math.round(downloadProgress)}%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" 
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {updateStatus === "latest" && (
                        <div className="px-4 pb-4 flex items-center gap-1.5 text-agent-green animate-in fade-in slide-in-from-top-1 duration-200">
                          <Check className="size-3" />
                          <span className="text-[10px] font-medium">You are on the latest version</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Providers" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h2 className="text-[18px] font-semibold text-white mb-1">Providers</h2>
                    <p className="text-[13px] text-white/40 mb-6">Manage your external service connections</p>
                    
                    <div className="space-y-6">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                            <Monitor className="size-4 text-primary/80" />
                          </div>
                          <div>
                            <div className="text-[14px] font-medium text-white/90">Registry Source</div>
                            <div className="text-[12px] text-white/30 leading-snug mt-0.5">
                              The GitHub repository used for discovering Skills and MCP Servers.
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            value={registryRepo}
                            onChange={(e) => setRegistryRepo(e.target.value)}
                            placeholder="owner/repo"
                            className="h-9 bg-black/40 border-white/5 text-[13px] text-white/90 focus-visible:ring-primary/20 font-mono rounded-lg px-3"
                          />
                          <Button 
                            variant="secondary"
                            onClick={handleSaveRepo} 
                            disabled={isSavingRepo || registryRepo.trim() === ""} 
                            className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white/80 border-white/5 rounded-lg text-[13px]"
                          >
                            {isSavingRepo ? <Loader2 className="size-3.5 animate-spin" /> : repoSaved ? <Check className="size-3.5 text-green-400" /> : "Save"}
                          </Button>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                            <ShieldCheck className="size-4 text-primary/80" />
                          </div>
                          <div>
                            <div className="text-[14px] font-medium text-white/90">GitHub Access Token</div>
                            <div className="text-[12px] text-white/30 leading-snug mt-0.5">
                              Required to bypass rate limits or access private registries.
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="password"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="ghp_..."
                            className="h-9 bg-black/40 border-white/5 text-[13px] text-white/90 focus-visible:ring-primary/20 font-mono rounded-lg px-3"
                          />
                          <Button 
                            variant="secondary"
                            onClick={handleSaveToken} 
                            disabled={isSavingToken} 
                            className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white/80 border-white/5 rounded-lg text-[13px]"
                          >
                            {isSavingToken ? <Loader2 className="size-3.5 animate-spin" /> : tokenSaved ? <Check className="size-3.5 text-green-400" /> : "Save"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === "Shortcuts" || activeTab === "Models") && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20 opacity-40 animate-in fade-in duration-300">
                  <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                    <Search className="size-5 text-white/40" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-white">Coming Soon</div>
                    <div className="text-[12px] text-white/40 mt-1 max-w-[200px]">We&apos;re still polishing the {activeTab.toLowerCase()} configuration.</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

      </div>
    </div>,
    document.body
  );
}
