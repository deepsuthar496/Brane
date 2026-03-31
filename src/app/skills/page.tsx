"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { skills as initialSkills } from "@/lib/data";
import { cn } from "@/lib/utils";

const tabs = ["All Skills", "Active", "Files", "Prompts"];

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState("All Skills");
  const [skillsList, setSkillsList] = useState(initialSkills);

  const toggleSkill = (id: string) => {
    setSkillsList((prev) =>
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
            breadcrumbs={["Workspace", "Skills"]}
            title="Skills"
            subtitle="Reusable prompt modules & capability packs for your agents"
            actions={
              <Button size="sm" className="h-7 px-2.5 text-xs gap-1.5">
                <Plus className="size-[13px]" />
                New Skill
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
            <div className="flex flex-col gap-0.5" role="list">
              {skillsList.map((skill) => (
                <div
                  key={skill.id}
                  tabIndex={0}
                  role="listitem"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer transition-colors border border-transparent hover:bg-card hover:border-border"
                >
                  <div className="size-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-[15px] shrink-0">
                    {skill.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium text-foreground">
                      {skill.name}
                    </div>
                    <div className="text-[11.5px] text-txt-3 font-mono mt-px truncate">
                      {skill.path} · {skill.description}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2.5">
                    <span className="text-[11px] text-txt-3">{skill.scope}</span>
                    <Switch
                      checked={skill.enabled}
                      onCheckedChange={() => toggleSkill(skill.id)}
                      aria-label={`Toggle ${skill.name} skill`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
