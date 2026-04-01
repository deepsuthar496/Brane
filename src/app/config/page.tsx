"use client";

import { useState, useEffect } from "react";
import {
  Monitor,
  Link2,
  Star,
  Terminal,
  Mail,
  FileText,
  Download,
  X,
  Plus,
  GitBranch,
  Check,
  AlertCircle,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SectionDivider } from "@/components/ui/section-divider";
import { cliFlags } from "@/lib/data";
import { cn } from "@/lib/utils";

const agentTabs = ["Claude Code", "Gemini CLI", "Cursor", "Global"];

const configSections = [
  { label: "General", icon: Monitor },
  { label: "MCP Servers", icon: Link2 },
  { label: "Skills", icon: Star },
  { label: "CLI Flags", icon: Terminal },
  { label: "Environment", icon: Mail },
  { label: "CLAUDE.md", icon: FileText },
];

const models = ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5", "Auto"];

export default function ConfigPage() {
  const [activeAgentTab, setActiveAgentTab] = useState("Claude Code");
  const [activeSection, setActiveSection] = useState("General");
  const [selectedModel, setSelectedModel] = useState("claude-opus-4-5");

  // GitHub & Registry State
  const [githubToken, setGithubToken] = useState("");
  const [registryRepo, setRegistryRepo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
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
  }, []);

  const handleUpdateConfig = async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const results = await Promise.all([
        window.electronAPI.setGithubToken(githubToken),
        window.electronAPI.setRegistryRepo(registryRepo)
      ]);
      
      if (results.every(r => r === true)) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "Config"]}
            title="Configuration"
            subtitle="Per-agent settings, CLI flags, and environment variables"
            actions={
              <>
                <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1.5">
                  <Download className="size-[13px]" />
                  Export
                </Button>
                <Button size="sm" className="h-7 px-2.5 text-xs" onClick={handleUpdateConfig}>
                  Save Changes
                </Button>
              </>
            }
          />

          {/* Agent Tabs */}
          <div className="flex items-center gap-0.5 px-7 pt-5 border-b border-border shrink-0" role="tablist" aria-label="Configuration sections">
            {agentTabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeAgentTab === tab}
                onClick={() => setActiveAgentTab(tab)}
                className={cn(
                  "px-3.5 py-2 text-[13px] font-[450] cursor-pointer border-b-2 transition-colors relative bottom-[-1px]",
                  activeAgentTab === tab
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
            <div className="grid grid-cols-[220px_1fr] gap-4 h-full">
              {/* Config sub-nav */}
              <div className="bg-card border border-border rounded-xl p-2 h-fit" aria-label="Configuration sections">
                {configSections.map((section) => (
                  <button
                    key={section.label}
                    aria-current={activeSection === section.label ? "true" : undefined}
                    onClick={() => setActiveSection(section.label)}
                    className={cn(
                      "flex items-center gap-[9px] px-2.5 py-[7px] rounded-md cursor-pointer text-[13px] w-full text-left transition-colors",
                      activeSection === section.label
                        ? "bg-sidebar-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <section.icon className="size-[13px]" />
                    {section.label}
                  </button>
                ))}
              </div>

              {/* Config panel */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                  {configSections.find(s => s.label === activeSection)?.icon && (
                    <div className="size-[15px] opacity-50 flex items-center justify-center">
                      {(() => {
                        const Icon = configSections.find(s => s.label === activeSection)!.icon;
                        return <Icon className="size-full" />;
                      })()}
                    </div>
                  )}
                  <div className="text-sm font-semibold text-foreground">
                    {activeSection} — {activeAgentTab}
                  </div>
                </div>
                <div className="p-5 flex flex-col gap-5">
                  {activeSection === "Environment" ? (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-4">
                        <SectionDivider label="GitHub & Registry Configuration" />
                        
                        <div className="grid grid-cols-1 gap-4">
                          {/* Token Field */}
                          <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-background border border-border flex items-center justify-center">
                                <GitBranch className="size-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold">GitHub Personal Access Token</div>
                                <div className="text-[11px] text-txt-3">Required for private marketplace & registry access</div>
                              </div>
                            </div>
                            <Input
                              type="password"
                              placeholder="ghp_••••••••••••••••••••••••••••••••••••"
                              value={githubToken}
                              onChange={(e) => setGithubToken(e.target.value)}
                              className="h-9 text-[13px] font-mono"
                            />
                          </div>

                          {/* Repo Field */}
                          <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-background border border-border flex items-center justify-center">
                                <Database className="size-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold">Registry Repository</div>
                                <div className="text-[11px] text-txt-3">The GitHub repository hosting your skill registry</div>
                              </div>
                            </div>
                            <Input
                              placeholder="owner/repo (e.g. deepsuthar496/Brane)"
                              value={registryRepo}
                              onChange={(e) => setRegistryRepo(e.target.value)}
                              className="h-9 text-[13px] font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            className="h-9 px-6"
                            onClick={handleUpdateConfig}
                            disabled={isSaving}
                          >
                            {saveStatus === "success" ? (
                              <div className="flex items-center gap-2">
                                <Check className="size-3.5" />
                                Updated
                              </div>
                            ) : saveStatus === "error" ? (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="size-3.5" />
                                Error
                              </div>
                            ) : (
                              "Update Registry Settings"
                            )}
                          </Button>
                        </div>
                        
                        <p className="text-[11px] text-txt-3 leading-relaxed px-1">
                          The Registry Repository tells Brane where to look for the <code className="bg-muted px-1 rounded text-[10px]">registry/</code> folder. 
                          If the repo is private, ensure you provide a PAT with <code className="bg-muted px-1 rounded text-[10px]">repo</code> scope.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2">
                        <label className="text-xs font-medium text-muted-foreground">Custom Environment Variables</label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input placeholder="VAR_NAME" className="h-8 text-xs font-mono w-1/3" />
                            <Input placeholder="value" className="h-8 text-xs font-mono flex-1" />
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-txt-4 hover:text-agent-red">
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="mt-2 h-8 w-fit text-xs gap-1.5 border-dashed">
                          <Plus className="size-3" />
                          Add Variable
                        </Button>
                      </div>
                    </div>
                  ) : activeSection === "General" ? (
                    <>
                      {/* Form fields */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted-foreground" htmlFor="install-path">
                            Install Path
                          </label>
                          <Input
                            id="install-path"
                            defaultValue="/usr/local/bin/claude"
                            className="h-[34px] text-[13px] font-mono bg-muted"
                          />
                          <span className="text-[11.5px] text-txt-3">
                            Absolute path to the binary
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted-foreground" htmlFor="working-dir">
                            Working Directory
                          </label>
                          <Input
                            id="working-dir"
                            defaultValue="~/projects"
                            className="h-[34px] text-[13px] font-mono bg-muted"
                          />
                        </div>
                      </div>

                      {/* Model selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          Default Model
                          <span className="text-[10.5px] font-normal text-txt-3 bg-muted px-1.5 py-px rounded">
                            optional
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Select default model">
                          {models.map((model) => (
                            <button
                              key={model}
                              aria-pressed={selectedModel === model}
                              onClick={() => setSelectedModel(model)}
                              className={cn(
                                "px-3 py-[5px] rounded-full border text-xs font-medium cursor-pointer transition-all",
                                selectedModel === model
                                  ? "bg-agent-purple-dim border-primary text-primary"
                                  : "border-border text-muted-foreground hover:border-input hover:text-foreground"
                              )}
                            >
                              {model}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CLI Flags */}
                      <SectionDivider label="CLI Flags" />
                      <table className="w-full border-collapse" aria-label="CLI flags">
                        <thead>
                          <tr>
                            <th className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-txt-3 pb-2.5 border-b border-border">
                              Flag
                            </th>
                            <th className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-txt-3 pb-2.5 border-b border-border">
                              Value
                            </th>
                            <th className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-txt-3 pb-2.5 border-b border-border">
                              Scope
                            </th>
                            <th className="w-10 pb-2.5 border-b border-border" />
                          </tr>
                        </thead>
                        <tbody>
                          {cliFlags.map((flag) => (
                            <tr key={flag.id}>
                              <td className="py-2.5 border-b border-border text-[13px]">
                                <span className="font-mono text-xs text-primary">
                                  {flag.name}
                                </span>
                              </td>
                              <td className="py-2.5 border-b border-border text-[13px]">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {flag.value}
                                </span>
                              </td>
                              <td className="py-2.5 border-b border-border">
                                <span className="text-[11px] text-txt-3">
                                  {flag.scope}
                                </span>
                              </td>
                              <td className="py-2.5 border-b border-border">
                                <button
                                  className="size-7 rounded-md border border-border bg-transparent text-txt-3 cursor-pointer flex items-center justify-center hover:bg-agent-red-dim hover:text-agent-red hover:border-transparent transition-colors"
                                  aria-label={`Remove flag ${flag.name}`}
                                >
                                  <X className="size-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Inline add flag */}
                      <div className="flex items-center gap-2 p-2 bg-card border border-dashed border-input rounded-lg">
                        <Plus className="size-3.5 opacity-30" />
                        <Input
                          placeholder="--flag-name…"
                          className="h-[30px] w-[200px] text-xs font-mono"
                        />
                        <Input
                          placeholder="value…"
                          className="h-[30px] w-[120px] text-xs font-mono"
                        />
                        <Button variant="outline" size="sm" className="h-[30px] text-xs">
                          Add Flag
                        </Button>
                      </div>

                      {/* System Prompt */}
                      <SectionDivider label="System Prompt Override" />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5" htmlFor="system-prompt">
                          System Prompt
                          <span className="text-[10.5px] font-normal text-txt-3 bg-muted px-1.5 py-px rounded">
                            optional
                          </span>
                        </label>
                        <Textarea
                          id="system-prompt"
                          className="min-h-[80px] text-[13px] font-mono bg-muted leading-relaxed"
                          defaultValue="You are an expert software engineer. Always prefer minimal, clean code solutions. Use TypeScript when possible."
                          placeholder="Custom system prompt appended to default…"
                        />
                        <span className="text-[11.5px] text-txt-3">
                          Appended to the agent&apos;s default system prompt
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-txt-4">
                      <div className="size-12 rounded-full bg-surface-2 flex items-center justify-center mb-4 opacity-50">
                        {(() => {
                          const Icon = configSections.find(s => s.label === activeSection)!.icon;
                          return <Icon className="size-6" />;
                        })()}
                      </div>
                      <h3 className="text-sm font-medium">Coming Soon</h3>
                      <p className="text-xs mt-1 max-w-[200px]">
                        The {activeSection} configuration for {activeAgentTab} is currently being implemented.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
