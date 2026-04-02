"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Monitor,
  Link2,
  Star,
  Lock,
  Settings,
  FileText,
  Activity,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { agents } from "@/lib/data";
import { AgentIcon } from "@/components/agents/agent-icon";

const mainNav = [
  { label: "Agents", icon: Monitor, href: "/", badge: "6" },
  { label: "Agent Store", icon: ShoppingBag, href: "/store" },
  { label: "MCP Servers", icon: Link2, href: "/mcps", badge: "8" },
  { label: "Skills", icon: Star, href: "/skills", badge: "12" },
  { label: "Credentials", icon: Lock, href: "/credentials", hasNotif: true },
];

const quickAccess = agents.slice(0, 4).map((a) => ({
  label: a.name,
  icon: a.icon,
  online: a.status === "running",
}));

const workspaceNav = [
  { label: "Config", icon: Settings, href: "/config" },
  { label: "Logs", icon: FileText, href: "/logs" },
  { label: "Activity", icon: Activity, href: "/activity" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
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
              : pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
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
        {quickAccess.map((agent) => (
          <button
            key={agent.label}
            className="flex items-center gap-[9px] px-2.5 py-1.5 rounded-md cursor-pointer text-[13px] font-[450] w-full text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span className="size-4 flex items-center justify-center shrink-0">
              <AgentIcon icon={agent.icon} className="size-3.5" />
            </span>
            {agent.label}
            <div
              className={cn(
                "size-[7px] rounded-full shrink-0 ml-auto",
                agent.online
                  ? "bg-agent-green shadow-[0_0_0_2px_var(--agent-green-dim)]"
                  : "bg-txt-3"
              )}
            />
          </button>
        ))}
      </div>

      {/* Workspace */}
      <div className="py-4 px-2 border-t border-border">
        <div className="text-[10.5px] font-semibold tracking-wide uppercase text-txt-3 px-2 mb-1">
          Workspace
        </div>
        {workspaceNav.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
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

      {/* User Pill */}
      <div className="mt-auto p-2 border-t border-border">
        <div
          tabIndex={0}
          role="button"
          aria-label="User settings"
          className="flex items-center gap-[9px] px-2 py-[7px] rounded-[7px] cursor-pointer hover:bg-muted transition-colors"
        >
          <div className="size-6 rounded-md bg-gradient-to-br from-primary to-purple-400 text-[10px] font-bold flex items-center justify-center text-white shrink-0">
            R
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium text-foreground">
              Rahul Dev
            </div>
            <div className="text-[11px] text-txt-3">Pro workspace</div>
          </div>
          <Settings className="size-[13px] opacity-30" />
        </div>
      </div>
    </nav>
  );
}
