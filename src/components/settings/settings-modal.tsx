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
  LucideIcon,
  ExternalLink,
  Palette
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
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

// Custom GitHub Icon since modern lucide-react removed brand icons
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabCategory = "General" | "Shortcuts" | "Credentials" | "Models";

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
        ? "bg-accent text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    )}
  >
    <Icon className={cn("size-[14px] transition-colors", activeTab === id ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground")} />
    {label}
  </button>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="text-[11px] font-semibold text-muted-foreground/30 mb-2 px-3 uppercase tracking-wider mt-6 first:mt-0">{title}</div>
);

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabCategory>("General");
  const { theme, setTheme } = useTheme();

  // Settings State
  const [codebaseIndexerEnabled, setCodebaseIndexerEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(true);

  // GitHub Token State
  const [githubToken, setGithubToken] = useState("");
  const [isSavingGithubToken, setIsSavingGithubToken] = useState(false);
  const [githubTokenSaved, setGithubTokenSaved] = useState(false);

  // Update State
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "downloading" | "ready" | "error" | "latest">("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // GitHub Copilot Auth state
  const [isCopilotDialogOpen, setIsCopilotDialogOpen] = useState(false);
  const [copilotAuthData, setCopilotAuthData] = useState<{
    userCode: string;
    verificationUri: string;
    deviceCode: string;
    interval: number;
  } | null>(null);
  const [isCopilotPolling, setIsCopilotPolling] = useState(false);

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
        toast.success("You are already up to date!");
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

  const startCopilotAuth = async () => {
    try {
      setIsCopilotPolling(false);
      setCopilotAuthData(null);
      setIsCopilotDialogOpen(true);

      const CLIENT_ID = "Ov23li8tweQw6odWQebz";
      const deviceResponse = await fetch("/api/github-copilot/device", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          scope: "read:user",
        }),
      });

      if (!deviceResponse.ok) {
        throw new Error("Failed to initiate device authorization");
      }

      const deviceData = await deviceResponse.json();
      setCopilotAuthData({
        userCode: deviceData.user_code,
        verificationUri: deviceData.verification_uri,
        deviceCode: deviceData.device_code,
        interval: deviceData.interval,
      });
      setIsCopilotPolling(true);

      // Start polling
      let polling = true;
      const pollAuth = async () => {
        while (polling) {
          try {
            const response = await fetch("/api/github-copilot/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                client_id: CLIENT_ID,
                device_code: deviceData.device_code,
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
              }),
            });

            if (!response.ok) {
              polling = false;
              setIsCopilotPolling(false);
              toast.error("Copilot authorization failed.");
              break;
            }

            const data = await response.json();

            if (data.access_token) {
              localStorage.setItem("github_copilot_token", data.access_token);
              // Trigger instant refresh across the app
              window.dispatchEvent(new CustomEvent("brane:github-token-updated"));
              toast.success("GitHub Copilot token saved securely!");
              setIsCopilotDialogOpen(false);
              polling = false;
              setIsCopilotPolling(false);
              break;
            }

            if (data.error === "authorization_pending") {
              await new Promise(resolve => setTimeout(resolve, deviceData.interval * 1000 + 3000));
              continue;
            }

            if (data.error === "slow_down") {
              const newInterval = (data.interval || deviceData.interval + 5) * 1000;
              await new Promise(resolve => setTimeout(resolve, newInterval + 3000));
              continue;
            }

            if (data.error) {
              polling = false;
              setIsCopilotPolling(false);
              toast.error(`Copilot auth error: ${data.error_description || data.error}`);
              break;
            }

            await new Promise(resolve => setTimeout(resolve, deviceData.interval * 1000 + 3000));
          } catch (e) {
            console.error("Polling error", e);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      };
      
      pollAuth();
    } catch (error) {
      console.error(error);
      toast.error("Failed to start GitHub Copilot login");
    }
  };

  const handleRestart = () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    window.electronAPI.restartAndInstall();
  };

  const handleSaveGithubToken = async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    setIsSavingGithubToken(true);
    setGithubTokenSaved(false);
    try {
      const success = await window.electronAPI.setGithubToken(githubToken);
      if (success) {
        setGithubTokenSaved(true);
        // Instant refresh trigger
        window.dispatchEvent(new CustomEvent("brane:github-token-updated"));
        setTimeout(() => setGithubTokenSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save token:", error);
    } finally {
      setIsSavingGithubToken(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (typeof window !== "undefined" && window.electronAPI) {
        window.electronAPI.getGithubToken().then(t => setGithubToken(t || ""));
      }

      const indexerState = localStorage.getItem("brane_codebase_indexer");
      if (indexerState !== null) {
        setCodebaseIndexerEnabled(indexerState === "true");
      }
      const memoryState = localStorage.getItem("brane_memory_enabled");
      if (memoryState !== null) {
        setMemoryEnabled(memoryState === "true");
      }
      const crashState = localStorage.getItem("brane_crash_reports_enabled");
      if (crashState !== null) {
        setCrashReportsEnabled(crashState === "true");
      }
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">

      {/* Settings Modal Container */}
      <div className="w-full max-w-[840px] h-[580px] flex rounded-xl overflow-hidden shadow-2xl border border-border bg-background relative animate-in zoom-in-95 duration-200">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground/40 hover:text-foreground transition-colors z-50 p-1 hover:bg-accent rounded-md"
        >
          <X className="size-4" />
        </button>

        {/* Sidebar */}
        <div className="w-[210px] bg-sidebar flex flex-col pt-8 pb-6 px-3 border-r border-border shrink-0">
          <SectionHeader title="Desktop" />
          <div className="space-y-0.5">
            <NavItem id="General" label="General" icon={SettingsIcon} activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="Shortcuts" label="Shortcuts" icon={Keyboard} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <SectionHeader title="Server" />
          <div className="space-y-0.5">
            <NavItem id="Credentials" label="Credentials" icon={ShieldCheck} activeTab={activeTab} setActiveTab={setActiveTab} />
            <NavItem id="Models" label="Models" icon={Sparkles} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <div className="mt-auto px-3">
            <div className="text-[11px] text-muted-foreground font-medium tracking-tight">Brane Hub Desktop</div>
            <div className="text-[10px] text-muted-foreground/50 mt-0.5 font-mono">v0.1.0</div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-background min-h-0">
          <ScrollArea className="h-full">
            <div className="p-8 max-w-[580px]">
              {activeTab === "General" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h2 className="text-[16px] font-semibold text-foreground mb-1">General</h2>
                    <p className="text-[12px] text-muted-foreground mb-6">Manage your core application settings</p>

                    <h2 className="text-[13px] font-semibold text-foreground/90 mb-4 tracking-tight">Appearance</h2>
                    <div className="space-y-0.5 bg-muted/20 border border-border rounded-xl overflow-hidden mb-8">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-foreground/90">Theme</div>
                          <div className="text-[11px] text-muted-foreground/60">Switch between green, light, and dark themes</div>
                        </div>
                        <Select value={theme} onValueChange={(val) => val && setTheme(val)}>
                          <SelectTrigger className="h-8 w-[140px] bg-muted/30 border-border text-[12px] text-foreground/70">
                            <SelectValue placeholder="Select theme" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-foreground/70 z-[1001]">
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-[13px] font-semibold text-foreground/90 mb-4 tracking-tight">Features</h2>
                    <div className="space-y-0.5 bg-muted/20 border border-border rounded-xl overflow-hidden mb-8">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-foreground/90">Send Crash Reports</div>
                          <div className="text-[11px] text-muted-foreground/60">Anonymously send crash logs to improve stability</div>
                        </div>
                        <Switch
                          checked={crashReportsEnabled}
                          onCheckedChange={async (checked) => {
                            setCrashReportsEnabled(checked);
                            localStorage.setItem("brane_crash_reports_enabled", checked ? "true" : "false");
                            if (window.electronAPI) {
                              await window.electronAPI.setCrashReportsEnabled(checked);
                            }
                          }}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      <Separator className="bg-border mx-4 w-auto" />
                      <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-foreground/90">Memory</div>
                          <div className="text-[11px] text-muted-foreground/60">Remember context and instructions across sessions (.brane/memory.md)</div>
                        </div>
                        <Switch
                          checked={memoryEnabled}
                          onCheckedChange={(checked) => {
                            setMemoryEnabled(checked);
                            localStorage.setItem("brane_memory_enabled", checked ? "true" : "false");
                          }}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      <Separator className="bg-border mx-4 w-auto" />
                      <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-foreground/90">Codebase Indexer</div>
                          <div className="text-[11px] text-muted-foreground/60">Automatically build a local symbol index to explore the codebase faster</div>
                        </div>
                        <Switch
                          checked={codebaseIndexerEnabled}
                          onCheckedChange={(checked) => {
                            setCodebaseIndexerEnabled(checked);
                            localStorage.setItem("brane_codebase_indexer", checked ? "true" : "false");
                          }}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>

                    <h2 className="text-[13px] font-semibold text-foreground/90 mb-4 tracking-tight">Updates</h2>
                    <div className="space-y-0.5 bg-muted/20 border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-foreground/90">Check for updates on startup</div>
                          <div className="text-[11px] text-muted-foreground/60">Automatically check for updates when Brane Hub launches</div>
                        </div>
                        <Switch className="data-[state=checked]:bg-primary" />
                      </div>
                      <Separator className="bg-border mx-4 w-auto" />
                      <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-foreground/90">Check for updates</div>
                          <div className="text-[11px] text-muted-foreground/60">Manually check for updates and install if available</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {updateStatus === "ready" ? (
                            <Button size="sm" onClick={handleRestart} className="h-7 bg-agent-green hover:bg-agent-green/90 text-primary-foreground font-bold text-[11px] px-4 rounded-lg">
                              Install Now
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={handleCheckForUpdates}
                              disabled={updateStatus === "checking" || updateStatus === "downloading"}
                              className="h-7 bg-muted/50 hover:bg-muted text-muted-foreground border-border text-[11px] px-4 rounded-lg"
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
                            <span className="text-muted-foreground italic">Downloading v0.1.1...</span>
                            <span className="text-primary/70 font-mono">{Math.round(downloadProgress)}%</span>
                          </div>
                          <div className="h-1 w-full bg-muted border border-border rounded-full overflow-hidden">
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

              {activeTab === "Credentials" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h2 className="text-[16px] font-semibold text-foreground mb-1">Credentials</h2>
                    <p className="text-[12px] text-muted-foreground mb-6">Manage your security tokens and access keys</p>

                    <div className="space-y-0.5 bg-muted/20 border border-border rounded-xl overflow-hidden">
                      <div className="p-5 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="size-8 rounded-lg bg-muted/40 flex items-center justify-center border border-border">
                            <ShieldCheck className="size-4 text-primary/80" />
                          </div>
                          <div>
                            <div className="text-[14px] font-medium text-foreground/90">GitHub Token</div>
                            <div className="text-[12px] text-muted-foreground/60 leading-snug mt-0.5">
                              Required to access the Brane Registry.
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-11">
                          <Input
                            type="password"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="ghp_..."
                            className="h-9 bg-background/40 border-border text-[13px] text-foreground/90 focus-visible:ring-primary/20 font-mono rounded-lg px-3"
                          />
                          <Button
                            variant="secondary"
                            onClick={handleSaveGithubToken}
                            disabled={isSavingGithubToken || githubToken.trim() === ""}
                            className="h-9 px-4 bg-muted/50 hover:bg-muted text-muted-foreground border-border rounded-lg text-[13px]"
                          >
                            {isSavingGithubToken ? <Loader2 className="size-3.5 animate-spin" /> : githubTokenSaved ? <Check className="size-3.5 text-green-400" /> : "Save"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Models" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h2 className="text-[16px] font-semibold text-foreground mb-1">Models</h2>
                    <p className="text-[12px] text-muted-foreground mb-6">Configure model providers and authentications</p>
                    
                    <div className="bg-muted/20 border border-border rounded-xl overflow-hidden mb-6">
                      <div className="px-4 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-muted/40 flex items-center justify-center border border-border">
                            <GitHubIcon className="size-4 text-primary/80" />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-foreground/90">GitHub Copilot</div>
                            <div className="text-[11px] text-muted-foreground/60 leading-tight">
                              Login to use your GitHub Copilot models.
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startCopilotAuth}
                          disabled={isCopilotDialogOpen || isCopilotPolling}
                          className="h-8 px-3 bg-background/50 hover:bg-background text-foreground/80 border-border rounded-lg text-[12px] gap-2"
                        >
                          <GitHubIcon className="size-3.5" />
                          Login
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Shortcuts" && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-20 opacity-40 animate-in fade-in duration-300">
                  <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center border border-border shadow-inner">
                    <Keyboard className="size-5 text-muted-foreground/40" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-foreground">Coming Soon</div>
                    <div className="text-[12px] text-muted-foreground/40 mt-1 max-w-[200px]">We&apos;re still polishing the {activeTab.toLowerCase()} configuration.</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Copilot Auth Inner Modal */}
        {isCopilotDialogOpen && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center animate-in fade-in">
            <div className="w-[420px] bg-card border border-border rounded-xl p-6 shadow-2xl relative">
              <button 
                onClick={() => { setIsCopilotDialogOpen(false); setIsCopilotPolling(false); }} 
                className="absolute top-4 right-4 text-muted-foreground/40 hover:text-foreground transition-colors p-1 hover:bg-accent rounded-md"
              >
                <X className="size-4" />
              </button>
              
              <h3 className="text-[16px] font-semibold text-foreground mb-1">GitHub Copilot Login</h3>
              <p className="text-[12px] text-muted-foreground mb-6 leading-snug">Authorize Brane to use your GitHub Copilot subscription.</p>
              
              <div className="flex flex-col items-center gap-4 text-center">
                {!copilotAuthData ? (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/60 py-6">
                    <Loader2 className="size-6 animate-spin" />
                    <p className="text-[13px]">Requesting device code...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-5 w-full">
                    <div className="space-y-2 w-full">
                      <p className="text-[12px] text-muted-foreground/60 font-medium">Your device confirmation code is:</p>
                      <div className="text-2xl font-mono tracking-widest font-bold bg-muted/40 p-3.5 rounded-xl border border-border w-full select-all text-foreground shadow-inner">
                        {copilotAuthData.userCode}
                      </div>
                    </div>
                    
                    <div className="space-y-3 w-full">
                      <Button 
                        className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90 h-10 shadow-[0_0_15px_rgba(var(--foreground-rgb),0.1)]" 
                        onClick={() => {
                          navigator.clipboard.writeText(copilotAuthData.userCode);
                          if (window.electronAPI?.openExternal) {
                            window.electronAPI.openExternal(copilotAuthData.verificationUri);
                          } else {
                            window.open(copilotAuthData.verificationUri, "_blank");
                          }
                          toast.success("Code copied! Opening GitHub...");
                        }}
                      >
                        <ExternalLink className="size-4" />
                        Copy Code & Open GitHub
                      </Button>
                      
                      {isCopilotPolling && (
                        <div className="flex items-center justify-center gap-2.5 text-[12px] text-muted-foreground/60 bg-muted/20 p-3 rounded-xl border border-border border-dashed">
                          <Loader2 className="size-3.5 animate-spin" />
                          Waiting for authorization...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
