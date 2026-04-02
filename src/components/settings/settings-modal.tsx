"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Settings as SettingsIcon,
  Check,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      
      {/* Settings Modal Container */}
      <div className="w-full max-w-[900px] h-[650px] flex rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#1c1c1c] relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-50 p-1 bg-black/20 hover:bg-black/40 rounded-md"
        >
          <X className="size-4" />
        </button>

        {/* Sidebar */}
        <div className="w-[220px] bg-[#141414] flex flex-col pt-8 pb-6 px-3 border-r border-white/5 shrink-0">
          <div className="text-[11px] font-semibold text-white/40 mb-3 px-3 uppercase tracking-wider">Application</div>
          <div className="space-y-0.5 mb-6">
            <button
              onClick={() => setActiveTab("General")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                activeTab === "General" 
                  ? "bg-[#282828] text-white border border-white/5 shadow-sm" 
                  : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <SettingsIcon className="size-[14px] opacity-80" />
              General
            </button>
          </div>

          <div className="mt-auto px-3">
            <div className="text-[12px] text-white/50 font-medium">Brane Hub</div>
            <div className="text-[11px] text-white/30 mt-0.5">v0.1.0</div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#1c1c1c]">
          {activeTab === "General" && (
            <div className="max-w-[560px]">
              <h2 className="text-[18px] font-bold text-white mb-6">General</h2>
              
              <div className="bg-[#181818] rounded-xl border border-white/5 flex flex-col shadow-sm">
                
                {/* Registry Source Setting */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 gap-6">
                  <div className="flex-1 pr-4">
                    <div className="text-[13px] font-medium text-white mb-0.5">Registry Source</div>
                    <div className="text-[12px] text-white/50 leading-snug">
                      The GitHub repository used for discovering and installing Skills and MCP Servers.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-[240px] shrink-0">
                    <Input 
                      value={registryRepo}
                      onChange={(e) => setRegistryRepo(e.target.value)}
                      placeholder="owner/repo"
                      className="h-7 flex-1 bg-[#222222] border-white/10 text-[12px] text-white focus-visible:ring-white/20 font-mono px-2.5 rounded-md"
                    />
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleSaveRepo} 
                      disabled={isSavingRepo || registryRepo.trim() === ""} 
                      className="h-7 px-3 text-[12px] font-medium bg-[#333333] hover:bg-[#444444] text-white border border-transparent rounded-md"
                    >
                      {isSavingRepo ? <Loader2 className="size-3 animate-spin" /> : repoSaved ? <Check className="size-3 text-green-400" /> : "Save"}
                    </Button>
                  </div>
                </div>

                {/* GitHub Token Setting */}
                <div className="flex items-center justify-between p-4 gap-6">
                  <div className="flex-1 pr-4">
                    <div className="text-[13px] font-medium text-white mb-0.5">GitHub Access Token</div>
                    <div className="text-[12px] text-white/50 leading-snug">
                      Required to bypass API rate limits or access private registry repositories.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-[240px] shrink-0">
                    <Input 
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_..."
                      className="h-7 flex-1 bg-[#222222] border-white/10 text-[12px] text-white focus-visible:ring-white/20 font-mono px-2.5 rounded-md"
                    />
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={handleSaveToken} 
                      disabled={isSavingToken} 
                      className="h-7 px-3 text-[12px] font-medium bg-[#333333] hover:bg-[#444444] text-white border border-transparent rounded-md"
                    >
                      {isSavingToken ? <Loader2 className="size-3 animate-spin" /> : tokenSaved ? <Check className="size-3 text-green-400" /> : "Save"}
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
