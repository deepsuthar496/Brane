"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SectionDivider } from "@/components/ui/section-divider";
import { mcpServers } from "@/lib/data";
import { cn } from "@/lib/utils";

const tabs = ["All", "Enabled", "Disabled", "Global"];

export default function MCPsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [servers, setServers] = useState(mcpServers);

  const categories = [...new Set(servers.map((s) => s.category))];

  const toggleServer = (id: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "MCP Servers"]}
            title="MCP Servers"
            subtitle="Model Context Protocol servers shared across agents"
            actions={
              <Button size="sm" className="h-7 px-2.5 text-xs gap-1.5">
                <Plus className="size-[13px]" />
                Add MCP
              </Button>
            }
          />

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-7 pt-5 border-b border-border shrink-0" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-2 text-[13px] font-[450] cursor-pointer border-b-2 transition-colors relative bottom-[-1px]",
                  activeTab === tab
                    ? "text-foreground border-primary font-medium"
                    : "text-txt-3 border-transparent hover:text-muted-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-7 py-5 pb-8">
            {categories.map((cat) => (
              <div key={cat}>
                <SectionDivider label={cat} />
                <div className="flex flex-col gap-0.5" role="list">
                  {servers
                    .filter((s) => s.category === cat)
                    .map((server) => (
                      <div
                        key={server.id}
                        tabIndex={0}
                        role="listitem"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer transition-colors border border-transparent hover:bg-card hover:border-border"
                      >
                        <div className="size-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-[15px] shrink-0">
                          {server.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13.5px] font-medium text-foreground">
                            {server.name}
                          </div>
                          <div className="text-[11.5px] text-txt-3 font-mono mt-px truncate">
                            {server.url}
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2.5">
                          <span className="text-[11px] text-txt-3">
                            {server.scope}
                          </span>
                          <Switch
                            checked={server.enabled}
                            onCheckedChange={() => toggleServer(server.id)}
                            aria-label={`Toggle ${server.name} MCP`}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {/* Inline add */}
            <div className="flex items-center gap-2 p-2 bg-card border border-dashed border-input rounded-lg mt-2">
              <Plus className="size-3.5 opacity-30" />
              <Input placeholder="Server name…" className="h-[30px] w-40 text-xs" />
              <Input placeholder="npx @mcpserver/name or https://…" className="h-[30px] flex-1 text-xs font-mono" />
              <Button variant="outline" size="sm" className="h-[30px] text-xs">
                Add
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
