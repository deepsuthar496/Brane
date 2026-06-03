"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mainNav, workspaceNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/settings/settings-modal";
import { Settings } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener("open-settings", handleOpenSettings);
    return () => window.removeEventListener("open-settings", handleOpenSettings);
  }, []);

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
                {item.hasNotif && (
                  <div className="ml-auto size-1.5 rounded-full bg-primary shrink-0" />
                )}
              </button>
            );
          })}
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
