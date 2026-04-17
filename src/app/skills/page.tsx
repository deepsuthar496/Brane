"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Grid, List, Package, Globe, Check, Download, Loader2, Filter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SkillCard } from "@/components/skills/skill-card";
import { SkillDetail } from "@/components/skills/skill-detail";
import { 
  getRegistryUrls, 
  RegistryIndex, 
  SkillEntry, 
  InstalledItem,
  CategoryMeta,
  fetchWithFallback
} from "@/lib/registry";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";

const tabs = ["Installed", "Discover"];

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState("Installed");
  const [searchQuery, setSearchQuery] = useState("");
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [registryRepo, setRegistryRepo] = useState<string>("deepsuthar496/Brane");
  
  // Registry state
  const [registryIndex, setRegistryIndex] = useState<RegistryIndex | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categorySkills, setCategorySkills] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillEntry | null>(null);
  
  // Installed state
  const [installedSkills, setInstalledSkills] = useState<Record<string, InstalledItem>>({});

  const registryUrls = useMemo(() => getRegistryUrls(registryRepo), [registryRepo]);

  const fetchTokenAndRepo = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const [token, repo] = await Promise.all([
        window.electronAPI.getGithubToken(),
        window.electronAPI.getRegistryRepo()
      ]);
      setGithubToken(token);
      setRegistryRepo(repo);
    }
  }, []);

  const fetchInstalled = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const installed = await window.electronAPI.getInstalledSkills();
      setInstalledSkills(installed || {});
    }
  }, []);

  const fetchRegistryIndex = useCallback(async () => {
    try {
      const data = await window.electronAPI.fetchRegistryData<RegistryIndex>(registryUrls.index);
      setRegistryIndex(data);
      setActiveCategory(prev => prev || (data.categories.skills.length > 0 ? data.categories.skills[0].id : null));
    } catch (error) {
      console.error("Failed to fetch registry index:", error);
    }
  }, [registryUrls]);

  const fetchCategorySkills = useCallback(async (categoryId: string) => {
    setLoading(true);
    try {
      const data = await window.electronAPI.fetchRegistryData<{ skills: SkillEntry[] }>(
        registryUrls.skillCategory(categoryId)
      );
      setCategorySkills(data.skills || []);
    } catch (error) {
      console.error(`Failed to fetch skills for category ${categoryId}:`, error);
    } finally {
      setLoading(false);
    }
  }, [registryUrls]);

  useEffect(() => {
    fetchTokenAndRepo();
    fetchInstalled();
  }, [fetchTokenAndRepo, fetchInstalled]);

  useEffect(() => {
    if (registryUrls && window.electronAPI) {
      fetchRegistryIndex();
    }
  }, [registryUrls, fetchRegistryIndex]);

  useEffect(() => {
    if (activeCategory && activeTab === "Discover") {
      fetchCategorySkills(activeCategory);
    }
  }, [activeCategory, activeTab, fetchCategorySkills]);

  const handleInstall = async (skill: SkillEntry) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.installSkill(skill);
      if (result.success) {
        await fetchInstalled();
      }
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.toggleSkill(id, enabled);
      if (result.success) {
        await fetchInstalled();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the "${id}" skill?`)) return;
    
    if (window.electronAPI) {
      const result = await window.electronAPI.uninstallSkill(id);
      if (result.success) {
        await fetchInstalled();
      }
    }
  };

  const filteredInstalled = Object.entries(installedSkills).filter(([id]) => 
    id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedSkill) {
    return (
      <div className="flex flex-col h-screen">
        <Titlebar />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 flex flex-col overflow-hidden bg-background">
            <SkillDetail 
              skill={selectedSkill} 
              isInstalled={!!installedSkills[selectedSkill.id]} 
              onInstall={handleInstall}
              onClose={() => setSelectedSkill(null)}
              registryRepo={registryRepo}
            />
          </main>
        </div>
      </div>
    );
  }

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

          <div className="flex-1 flex overflow-hidden">
            {activeTab === "Discover" && (
              <aside className="w-56 border-r border-border flex flex-col shrink-0">
                <div className="p-4 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-txt-4" />
                    <Input 
                      placeholder="Search registry..." 
                      className="pl-8 h-8 text-xs bg-surface-1 border-border"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="text-[10px] font-bold text-txt-4 uppercase tracking-wider px-3 mb-2">
                    Categories
                  </div>
                  <nav className="space-y-0.5">
                    {registryIndex?.categories.skills.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors",
                          activeCategory === cat.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-txt-3 hover:bg-surface-2 hover:text-foreground"
                        )}
                      >
                        <span className="size-4 flex items-center justify-center">{cat.icon}</span>
                        <span className="flex-1 text-left">{cat.label}</span>
                        <span className="text-[10px] text-txt-4">{cat.count}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            <div className="flex-1 overflow-y-auto bg-background">
              {activeTab === "Installed" ? (
                <div className="px-7 py-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-txt-4" />
                      <Input 
                        placeholder="Search installed skills..." 
                        className="pl-8 h-8 text-xs bg-background border-border"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    {filteredInstalled.length > 0 ? (
                      filteredInstalled.map(([id, skill]) => (
                        <div
                          key={id}
                          className="flex items-center gap-4 px-4 py-3 rounded-xl bg-background border border-border group hover:border-primary/30 transition-all shadow-sm"
                        >
                          <div className="size-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-[18px] shrink-0">
                            <Package className="size-5 text-primary/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold text-foreground">{id}</span>
                              <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[10px] text-txt-3 font-medium">
                                v{skill.version}
                              </span>
                            </div>
                            <div className="text-[12px] text-txt-3 mt-0.5 truncate">
                              {skill.path}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-txt-4 uppercase font-bold tracking-wider">Status</span>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[11px] font-medium",
                                  skill.enabled ? "text-green-500" : "text-txt-4"
                                )}>
                                  {skill.enabled ? "Enabled" : "Disabled"}
                                </span>
                                <Switch
                                  checked={skill.enabled}
                                  onCheckedChange={(checked) => handleToggle(id, checked)}
                                  className="scale-90"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0 text-txt-4 hover:text-agent-red hover:bg-agent-red-dim transition-colors"
                              onClick={() => handleDelete(id)}
                              aria-label={`Delete ${id} skill`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="size-12 rounded-full bg-surface-2 flex items-center justify-center mb-4">
                          <Package className="size-6 text-txt-4" />
                        </div>
                        <h3 className="text-sm font-medium text-foreground">No skills installed</h3>
                        <p className="text-xs text-txt-3 mt-1 max-w-[200px]">
                          Visit the Discover tab to find and install new agent capabilities.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-6 h-8 text-xs"
                          onClick={() => setActiveTab("Discover")}
                        >
                          Go to Discover
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-7 py-6">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="size-8 animate-spin text-primary/50" />
                      <p className="text-xs text-txt-3 mt-4">Loading skills...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 border-t border-l border-white/5 bg-white/[0.02]">
                      {categorySkills.map((skill) => (
                        <SkillCard
                          key={skill.id}
                          skill={skill}
                          isInstalled={!!installedSkills[skill.id]}
                          onClick={setSelectedSkill}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
