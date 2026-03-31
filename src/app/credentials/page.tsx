"use client";

import { useState } from "react";
import { Plus, Copy, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SectionDivider } from "@/components/ui/section-divider";
import { StatusBadge } from "@/components/ui/status-badge";
import { credentials } from "@/lib/data";
import { cn } from "@/lib/utils";

const tabs = ["All Keys", "Missing", "Expired"];

export default function CredentialsPage() {
  const [activeTab, setActiveTab] = useState("All Keys");

  const categories = [...new Set(credentials.map((c) => c.category))];

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "Credentials"]}
            title="Credentials"
            subtitle="API keys & tokens stored securely in your system keychain"
            actions={
              <Button size="sm" className="h-7 px-2.5 text-xs gap-1.5">
                <Plus className="size-[13px]" />
                Add Key
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
                {credentials
                  .filter((c) => c.category === cat)
                  .map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-[9px] mb-2"
                    >
                      <div className="size-[34px] rounded-lg bg-muted border border-border flex items-center justify-center text-base shrink-0">
                        {cred.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-foreground">
                          {cred.envVar}
                        </div>
                        <div
                          className={cn(
                            "text-[11.5px] font-mono mt-0.5 truncate",
                            cred.status === "missing"
                              ? "text-agent-red"
                              : "text-txt-3"
                          )}
                        >
                          {cred.maskedKey}
                        </div>
                      </div>
                      <StatusBadge
                        status={
                          cred.status === "valid"
                            ? "active"
                            : cred.status === "missing"
                            ? "error"
                            : "inactive"
                        }
                        label={
                          cred.status === "valid"
                            ? "Valid"
                            : cred.status === "missing"
                            ? "Missing"
                            : "Expired"
                        }
                        className="mr-3"
                      />
                      {cred.status === "missing" ? (
                        <Button size="sm" className="h-[30px] text-xs">
                          Add Key
                        </Button>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            className="size-7 rounded-md border border-border bg-transparent text-txt-3 cursor-pointer flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={`Copy ${cred.envVar}`}
                          >
                            <Copy className="size-[13px]" />
                          </button>
                          <button
                            className="size-7 rounded-md border border-border bg-transparent text-txt-3 cursor-pointer flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={`Edit ${cred.envVar}`}
                          >
                            <Pencil className="size-[13px]" />
                          </button>
                          <button
                            className="size-7 rounded-md border border-border bg-transparent text-txt-3 cursor-pointer flex items-center justify-center hover:bg-agent-red-dim hover:text-agent-red hover:border-transparent transition-colors"
                            aria-label={`Delete ${cred.envVar}`}
                          >
                            <Trash2 className="size-[13px]" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
