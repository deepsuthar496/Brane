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
  Database,
  Monitor,
  Keyboard,
  Globe,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("General");
  
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
  const [checkOnStartup, setCheckOnStartup] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Load checkOnStartup from localStorage
    const saved = localStorage.getItem("brane_check_updates_startup");
    if (saved !== null) setCheckOnStartup(saved === "true");
  }, []);

  const handleToggleStartup = (checked: boolean) => {
    setCheckOnStartup(checked);
    localStorage.setItem("brane_check_updates_startup", String(checked));
  };

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
          try {
            const [token, repo] = await Promise.all([
              window.electronAPI.getGithubToken(),
              window.electronAPI.getRegistryRepo()
            ]);
            setGithubToken(token || "");
            setRegistryRepo(repo || "deepsuthar496/Brane");
          } catch (err) {
            console.error("Failed to load settings config", err);
          }
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      
      {/* Settings Modal Container */}
      <div className="w-full max-w-[940px] h-[680px] flex rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-[#0f0f0f] relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors z-50 p-1.5 hover:bg-white/5 rounded-lg"
        >
          <X className="size-4" />
        </button>

        {/* Sidebar */}
        <div className="w-[240px] bg-[#141414] flex flex-col pt-10 pb-8 px-4 border-r border-white/5 shrink-0">
          
          <div className="flex flex-col gap-8 flex-1 overflow-y-auto scrollbar-none">
            {/* Desktop Category */}
            <div>
              <div className="text-[11px] font-bold text-white/30 mb-3 px-3 uppercase tracking-[0.1em]">Desktop</div>
              <div className="space-y-0.5">
                {[
                  { id: "General", icon: SettingsIcon, label: "General" },
                  { id: "Shortcuts", icon: Keyboard, label: "Shortcuts" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group",
                      activeTab === item.id 
                        ? "bg-white/10 text-white shadow-sm" 
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("size-4 transition-colors", activeTab === item.id ? "text-primary" : "text-white/30 group-hover:text-white/50")} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Registry Category */}
            <div>
              <div className="text-[11px] font-bold text-white/30 mb-3 px-3 uppercase tracking-[0.1em]">Registry</div>
              <div className="space-y-0.5">
                {[
                  { id: "Source", icon: Database, label: "Source" },
                  { id: "Token", icon: Globe, label: "GitHub Token" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group",
                      activeTab === item.id 
                        ? "bg-white/10 text-white shadow-sm" 
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("size-4 transition-colors", activeTab === item.id ? "text-primary" : "text-white/30 group-hover:text-white/50")} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto px-3 border-t border-white/5 pt-6">
            <div className="text-[13px] text-white/80 font-bold tracking-tight">Brane Hub Desktop</div>
            <div className="text-[11px] text-white/30 font-mono mt-0.5">v0.1.0</div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="max-w-[640px] mx-auto py-12 px-10">
            <h1 className="text-[24px] font-bold text-white mb-8 tracking-tight">{activeTab}</h1>
            
            {activeTab === "General" && (
              <div className="space-y-10">
                
                {/* Updates Section */}
                <section>
                  <h3 className="text-[13px] font-semibold text-white/40 mb-4 uppercase tracking-wider">Updates</h3>
                  <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
                    
                    {/* Check on Startup */}
                    <div className="flex items-center justify-between p-5 border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-1">
                        <div className="text-[14px] font-medium text-white/90">Check for updates on startup</div>
                        <div className="text-[12px] text-white/40 leading-relaxed">
                          Automatically check for new versions when Brane Hub launches
                        </div>
                      </div>
                      <Switch 
                        checked={checkOnStartup} 
                        onCheckedChange={handleToggleStartup} 
                        className="data-checked:bg-primary"
                      />
                    </div>

                    {/* Release Notes */}
                    <div className="flex items-center justify-between p-5 border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-1">
                        <div className="text-[14px] font-medium text-white/90">Release notes</div>
                        <div className="text-[12px] text-white/40 leading-relaxed">
                          Show What's New popups after updating to a new version
                        </div>
                      </div>
                      <Switch defaultChecked className="data-checked:bg-primary" />
                    </div>

                    {/* Check Now */}
                    <div className="flex items-center justify-between p-5 hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-1">
                        <div className="text-[14px] font-medium text-white/90">Check for updates</div>
                        <div className="text-[12px] text-white/40 leading-relaxed">
                          Manually check for updates and install if available
                        </div>
                        
                        {/* Status Messaging */}
                        {updateStatus === "latest" && (
                          <div className="flex items-center gap-1.5 text-agent-green mt-2 animate-in fade-in slide-in-from-left-2">
                            <Check className="size-3" />
                            <span className="text-[11px] font-medium">You're on the latest version</span>
                          </div>
                        )}
                        {updateStatus === "error" && (
                          <div className="flex items-center gap-1.5 text-agent-red mt-2 animate-in fade-in slide-in-from-left-2">
                            <AlertCircle className="size-3" />
                            <span className="text-[11px] font-medium">{errorMessage || "Update failed"}</span>
                          </div>
                        )}
                        {updateStatus === "downloading" && (
                          <div className="mt-3 w-48 space-y-1.5 animate-in fade-in">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-white/30 italic">Downloading...</span>
                              <span className="text-primary font-bold">{Math.round(downloadProgress)}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300" 
                                style={{ width: `${downloadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {updateStatus === "ready" ? (
                        <Button 
                          onClick={handleRestart}
                          className="bg-agent-green hover:bg-agent-green/90 text-black font-bold h-9 px-5 rounded-xl shadow-lg shadow-agent-green/10 flex items-center gap-2"
                        >
                          <Download className="size-4" />
                          Restart and Install
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleCheckForUpdates}
                          disabled={updateStatus === "checking" || updateStatus === "downloading"}
                          variant="secondary"
                          className="bg-[#222] hover:bg-[#2a2a2a] text-white/80 border border-white/5 h-9 px-5 rounded-xl transition-all"
                        >
                          {updateStatus === "checking" ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="size-3.5 animate-spin text-primary" />
                              <span>Checking...</span>
                            </div>
                          ) : (
                            "Check now"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </section>

                {/* Notifications Section */}
                <section>
                  <h3 className="text-[13px] font-semibold text-white/40 mb-4 uppercase tracking-wider">Notifications</h3>
                  <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
                     <div className="flex items-center justify-between p-5 hover:bg-white/[0.01] transition-colors">
                        <div className="space-y-1">
                          <div className="text-[14px] font-medium text-white/90">Agent status alerts</div>
                          <div className="text-[12px] text-white/40 leading-relaxed">
                            Show desktop notifications when an agent crashes or finishes a long task
                          </div>
                        </div>
                        <Switch defaultChecked className="data-checked:bg-primary" />
                      </div>
                  </div>
                </section>

              </div>
            )}

            {activeTab === "Source" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-[#141414] p-8 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Database className="size-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Registry Source</h3>
                      <p className="text-sm text-white/40">Where Brane Hub looks for Skills and MCPs</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-[13px] font-medium text-white/60 ml-1">GitHub Repository (owner/repo)</label>
                    <div className="flex gap-3">
                      <Input 
                        value={registryRepo}
                        onChange={(e) => setRegistryRepo(e.target.value)}
                        placeholder="owner/repo"
                        className="bg-[#0a0a0a] border-white/10 h-11 px-4 rounded-xl text-white focus-visible:ring-primary/20 font-mono"
                      />
                      <Button 
                        onClick={handleSaveRepo} 
                        disabled={isSavingRepo || registryRepo.trim() === ""} 
                        className="h-11 px-6 rounded-xl font-bold bg-white text-black hover:bg-white/90"
                      >
                        {isSavingRepo ? <Loader2 className="size-4 animate-spin" /> : repoSaved ? <Check className="size-4" /> : "Save"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-white/30 italic mt-2 ml-1">Default: deepsuthar496/Brane</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Token" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-[#141414] p-8 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Globe className="size-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">GitHub Access Token</h3>
                      <p className="text-sm text-white/40">Personal Access Token for API requests</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-[13px] font-medium text-white/60 ml-1">Personal Access Token (classic or fine-grained)</label>
                    <div className="flex gap-3">
                      <Input 
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_..."
                        className="bg-[#0a0a0a] border-white/10 h-11 px-4 rounded-xl text-white focus-visible:ring-primary/20 font-mono"
                      />
                      <Button 
                        onClick={handleSaveToken} 
                        disabled={isSavingToken} 
                        className="h-11 px-6 rounded-xl font-bold bg-white text-black hover:bg-white/90"
                      >
                        {isSavingToken ? <Loader2 className="size-4 animate-spin" /> : tokenSaved ? <Check className="size-4" /> : "Save"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-white/30 leading-relaxed mt-4 ml-1">
                      Required if you hit GitHub's rate limits or wish to use a private repository as your registry source.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Shortcuts" && (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
                <div className="size-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <Keyboard className="size-8 text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white">Keyboard Shortcuts</h3>
                <p className="text-sm text-white/40 max-w-[280px] mt-2">Custom shortcuts for quick agent access are coming soon.</p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
