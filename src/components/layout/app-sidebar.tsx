"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { mainNav, workspaceNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Agent, AgentStatus } from "@/lib/data";
import { AgentIcon } from "@/components/agents/agent-icon";
import { SettingsModal } from "@/components/settings/settings-modal";
import { Settings } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);

  // 1. Initial Load
  useEffect(() => {
    async function loadAgents() {
      if (typeof window !== "undefined" && window.electronAPI) {
        try {
          const discovered = await window.electronAPI.discoverCLIs();
          const updatedAgents = await Promise.all((discovered || []).map(async (agent: any) => {
            const { status } = await window.electronAPI.getAgentStatus(agent.id);
            return { ...agent, status: status as AgentStatus };
          }));
          setAgents(updatedAgents);
        } catch (err) {
          console.error("Sidebar: Failed to load agents", err);
        }
      }
    }
    loadAgents();

    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener("open-settings", handleOpenSettings);
    return () => window.removeEventListener("open-settings", handleOpenSettings);
  }, []);

  // 2. Status Subscriptions
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI || agents.length === 0) return;
    
    const unsubs: (() => void)[] = [];
    agents.forEach(agent => {
      const unsub = window.electronAPI.onAgentStatus(agent.id, (data: { status: string }) => {
        setAgents(prev => prev.map(a => 
          a.id === agent.id ? { ...a, status: data.status as AgentStatus } : a
        ));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.map(a => a.id).join(",")]);

  const quickAccess = agents.slice(0, 4);

  const handleQuickAccessClick = (agentId: string) => {
    const currentAgent = searchParams.get("agent");
    if (pathname === "/" && currentAgent === agentId) return;
    router.push(`/?agent=${agentId}`);
  };

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="w-[228px] bg-card border-r border-border flex flex-col shrink-0 overflow-y-auto scrollbar-none"
      >
        {/* Main Nav */}
        <div className="py-4 px-2">
          {mainNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href || "");
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href || "")}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-[9px] px-2 py-1.5 rounded-md cursor-pointer text-[13px] font-[450] w-full text-left transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className={cn("size-4 flex items-center justify-center shrink-0", isActive ? "opacity-100" : "opacity-75")}>
                  <item.icon className="size-[15px]" />
                </span>
                {item.label}
                {item.badge && (
                  <span
                    className={cn(
                      "ml-auto text-[10px] font-semibold rounded-full px-1.5 py-px min-w-[18px] text-center",
                      isActive
                        ? "bg-agent-purple-dim text-primary"
                        : "bg-muted text-txt-3"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
                {item.hasNotif && (
                  <div className="ml-auto size-1.5 rounded-full bg-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Access */}
        <div className="py-4 px-2 border-t border-border">
          <div className="text-[10.5px] font-semibold tracking-wide uppercase text-txt-3 px-2 mb-1">
            Quick Access
          </div>
          {quickAccess.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-txt-4 italic">No agents discovered</div>
          ) : (
            quickAccess.map((agent) => {
              const isRunning = agent.status === "running";
              const isActive = pathname === "/" && searchParams.get("agent") === agent.id;

              return (
                <button
                  key={agent.id}
                  onClick={() => handleQuickAccessClick(agent.id)}
                  className={cn(
                    "flex items-center gap-[9px] px-2.5 py-1.5 rounded-md cursor-pointer text-[13px] font-[450] w-full text-left transition-all",
                    isActive
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="relative">
                    <span className={cn(
                      "size-4 flex items-center justify-center shrink-0 transition-transform",
                      isRunning && "scale-110"
                    )}>
                      <AgentIcon icon={agent.icon} className="size-3.5" />
                    </span>
                    {isRunning && (
                      <div className="absolute inset-0 size-4 bg-primary/20 rounded-full blur-[4px] animate-pulse" />
                    )}
                  </div>
                  <span className="truncate flex-1">{agent.name}</span>
                  <div
                    className={cn(
                      "size-[6px] rounded-full shrink-0 ml-auto transition-all",
                      isRunning
                        ? "bg-agent-green shadow-[0_0_0_2px_var(--agent-green-dim)]"
                        : agent.status === "error"
                        ? "bg-agent-red shadow-[0_0_0_2px_var(--agent-red-dim)]"
                        : "bg-txt-4"
                    )}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Workspace */}
        {workspaceNav.length > 0 && (
          <div className="py-4 px-2 border-t border-border">
            <div className="text-[10.5px] font-semibold tracking-wide uppercase text-txt-3 px-2 mb-1">
              Workspace
            </div>
            {workspaceNav.map((item) => {
              const isActive = pathname.startsWith(item.href || "");
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href || "")}
                  className={cn(
                    "flex items-center gap-[9px] px-2 py-1.5 rounded-md cursor-pointer text-[13px] font-[450] w-full text-left transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="size-4 flex items-center justify-center shrink-0 opacity-75">
                    <item.icon className="size-[15px]" />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Settings Button */}
        <div className="mt-auto p-2 border-t border-border">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              "flex items-center gap-[9px] px-2 py-[7px] rounded-[7px] cursor-pointer w-full text-left transition-colors",
              isSettingsOpen
                ? "bg-sidebar-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground font-[450]"
            )}
          >
            <span className="size-4 flex items-center justify-center shrink-0">
              <Settings className="size-[15px]" />
            </span>
            <span className="text-[13px]">Settings</span>
          </button>
        </div>
      </nav>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
}
