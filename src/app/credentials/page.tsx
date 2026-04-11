"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Plus, Copy, Pencil, Trash2, Search, ExternalLink, ShieldCheck, 
  ShieldAlert, ShieldX, Eye, EyeOff, MoreVertical, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Credential } from "@/lib/data";
import { cn } from "@/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CredentialsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<any | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    envVar: "",
    category: "General",
    value: ""
  });

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getAllCredentials();
        // Enrich data with UI-only fields
        const enriched = data.map(c => ({
          ...c,
          status: "valid", // For now we assume they are valid if they exist
          maskedKey: maskKey(c.value),
          category: getCategoryForVar(c.envVar)
        }));
        setCredentials(enriched);
      }
    } catch (error) {
      console.error("Failed to load credentials:", error);
      toast.error("Failed to load credentials from system keychain");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const maskKey = (key: string) => {
    if (!key) return "Not configured";
    if (key.length <= 8) return "••••••••";
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 2)}`;
  };



  const getCategoryForVar = (v: string) => {
    const lower = v.toLowerCase();
    if (lower.includes("anthropic") || lower.includes("gemini") || lower.includes("openai") || lower.includes("claude")) return "LLM Provider";
    if (lower.includes("github") || lower.includes("gitlab") || lower.includes("bitbucket")) return "Version Control";
    if (lower.includes("db") || lower.includes("database") || lower.includes("postgres") || lower.includes("redis")) return "Database";
    return "General";
  };

  const filteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      const matchesSearch = 
        cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cred.envVar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cred.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "valid" && cred.status === "valid") ||
        (activeTab === "missing" && cred.status === "missing") ||
        (activeTab === "expired" && cred.status === "expired");
        
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, credentials]);

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSave = async () => {
    if (!formData.envVar || !formData.value) {
      toast.error("Environment variable name and value are required");
      return;
    }

    try {
      await window.electronAPI.saveCredential(formData.envVar, formData.value);
      toast.success(`Credential ${formData.envVar} saved successfully`);
      setIsDialogOpen(false);
      loadCredentials();
      setFormData({ name: "", envVar: "", category: "General", value: "" });
    } catch (error) {
      toast.error("Failed to save credential");
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete ${key}? This cannot be undone.`)) return;
    
    try {
      await window.electronAPI.deleteCredential(key);
      toast.success(`Credential ${key} removed`);
      loadCredentials();
    } catch (error) {
      toast.error("Failed to delete credential");
    }
  };



  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "Credentials"]}
            title="Credentials"
            subtitle="API keys & tokens stored securely in your system keychain"
            actions={
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingCredential(null);
                  setFormData({ name: "", envVar: "", category: "General", value: "" });
                }
              }}>
                <DialogTrigger 
                  render={
                    <Button size="sm" className="h-8 gap-1.5 shadow-sm">
                      <Plus className="size-3.5" />
                      Add Credential
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingCredential ? "Edit Credential" : "Add Credential"}</DialogTitle>
                    <DialogDescription>
                      Enter the details for the API key or token. It will be stored securely in your system keychain.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="envVar">Environment Variable Name</Label>
                      <Input 
                        id="envVar" 
                        placeholder="e.g. ANTHROPIC_API_KEY" 
                        className="font-mono"
                        value={formData.envVar}
                        onChange={e => setFormData({ ...formData, envVar: e.target.value.toUpperCase() })}
                        disabled={!!editingCredential}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="key">API Key / Token Value</Label>
                      <Input 
                        id="key" 
                        type="password" 
                        placeholder={editingCredential ? "Enter new value to update..." : "sk-..."} 
                        value={formData.value}
                        onChange={e => setFormData({ ...formData, value: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSave}>
                      {editingCredential ? "Update Credential" : "Save Credential"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
          />

          <div className="px-7 pt-5 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="h-9 p-1 bg-muted/50">
                  <TabsTrigger value="all" className="px-4 text-[12px]">All</TabsTrigger>
                  <TabsTrigger value="valid" className="px-4 text-[12px]">Valid</TabsTrigger>
                  <TabsTrigger value="missing" className="px-4 text-[12px]">Missing</TabsTrigger>
                </TabsList>
              </Tabs>

              <InputGroup className="max-w-[280px] h-9">
                <InputGroupAddon>
                  <Search className="size-3.5 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput 
                  placeholder="Search credentials..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-[13px]"
                />
              </InputGroup>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-7 py-5">
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="w-[280px] py-3 h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 pl-6">Service</TableHead>
                    <TableHead className="py-3 h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Variable</TableHead>
                    <TableHead className="py-3 h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Key (Masked)</TableHead>
                    <TableHead className="py-3 h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
                    <TableHead className="w-[80px] py-3 h-10 text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="size-8 animate-spin opacity-20" />
                          <p className="text-[13px]">Loading secure credentials...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCredentials.length > 0 ? (
                    filteredCredentials.map((cred) => (
                      <TableRow key={cred.id} className="group hover:bg-muted/30 transition-colors border-b last:border-0">
                        <TableCell className="py-4 pl-6">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-foreground leading-tight">
                              {cred.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {cred.category}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                            {cred.envVar}
                          </code>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2 group/key">
                            <span className={cn(
                              "text-[12px] font-mono tracking-tight",
                              cred.status === "missing" ? "text-destructive/80 italic" : "text-muted-foreground"
                            )}>
                              {showKeys[cred.id] ? cred.value : cred.maskedKey}
                            </span>
                            {cred.status !== "missing" && (
                              <div className="flex items-center gap-1 opacity-0 group-hover/key:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleCopy(cred.value, "Key")}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                  title="Copy Value"
                                >
                                  <Copy className="size-3" />
                                </button>
                                <button 
                                  onClick={() => toggleShowKey(cred.id)}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                  title={showKeys[cred.id] ? "Mask Key" : "Reveal Key"}
                                >
                                  {showKeys[cred.id] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                </button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            {cred.status === "valid" && <ShieldCheck className="size-3.5 text-emerald-500" />}
                            {cred.status === "missing" && <ShieldAlert className="size-3.5 text-destructive" />}
                            {cred.status === "expired" && <ShieldX className="size-3.5 text-amber-500" />}
                            <span className={cn(
                              "text-[12px] font-medium",
                              cred.status === "valid" && "text-emerald-500",
                              cred.status === "missing" && "text-destructive",
                              cred.status === "expired" && "text-amber-500"
                            )}>
                              {cred.status.charAt(0).toUpperCase() + cred.status.slice(1)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" className="size-8 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="size-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuLabel className="text-[11px] font-bold uppercase text-muted-foreground">Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="text-[12px] cursor-pointer" onClick={() => handleCopy(cred.envVar, "Variable")}>
                                <Copy className="size-3.5 mr-2" /> Copy Variable
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-[12px] cursor-pointer" onClick={() => {
                                setEditingCredential(cred);
                                setFormData({
                                  name: cred.name,
                                  envVar: cred.envVar,
                                  category: cred.category,
                                  value: cred.value
                                });
                                setIsDialogOpen(true);
                              }}>
                                <Pencil className="size-3.5 mr-2" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-[12px] text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => handleDelete(cred.envVar)}
                              >
                                <Trash2 className="size-3.5 mr-2" /> Remove Key
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Search className="size-8 opacity-20" />
                          <p className="text-[13px]">No credentials found</p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-[12px] h-auto p-0"
                            onClick={() => {
                              setSearchQuery("");
                              setActiveTab("all");
                            }}
                          >
                            Clear all filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border border-dashed flex items-start gap-4">
              <div className="size-8 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                <ExternalLink className="size-4 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-[13px] font-semibold">Security Note</h4>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Your API keys are stored in the system's native keychain (macOS Keychain, Windows Credential Manager, or gnome-keyring). 
                  They are never stored in plain text on your hard drive.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
