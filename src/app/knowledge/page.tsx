"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Search, 
  Plus, 
  BrainCircuit, 
  Loader2, 
  MoreHorizontal,
  FileCode,
  Database,
  History,
  FileJson,
  LayoutGrid,
  List as ListIcon,
  FolderPlus,
  FolderOpen,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { KnowledgeCard } from "@/components/knowledge/knowledge-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  updatedAt: string;
  extension: string;
  collection: string;
}

export default function KnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Dialog States
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [movingFile, setMovingFile] = useState<{name: string, collection: string} | null>(null);

  const loadFiles = useCallback(async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    try {
      setIsLoading(true);
      const list = await window.electronAPI.listKnowledgeFiles();
      setFiles(list);
    } catch (error) {
      console.error("Failed to load knowledge files:", error);
      toast.error("Failed to load knowledge index");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const collections = useMemo(() => {
    const set = new Set(files.map(f => f.collection));
    return Array.from(set).sort();
  }, [files]);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    try {
      // If we are in a virtual filter, default to General. If in a collection, use that.
      const isVirtual = ["all", "docs", "code", "history"].includes(activeCategory);
      const targetCollection = isVirtual ? "General" : activeCategory;

      for (const file of droppedFiles) {
        const filePath = (file as any).path;
        if (filePath) {
          await window.electronAPI.addKnowledgeFileFromPath(filePath, targetCollection);
        } else {
          const text = await file.text();
          await window.electronAPI.addKnowledgeFile(file.name, text, targetCollection);
        }
      }
      toast.success(`Indexed ${droppedFiles.length} file(s) into ${targetCollection}`);
      loadFiles();
    } catch (error) {
      console.error("Knowledge: upload error", error);
      toast.error("Failed to index files");
    }
  };

  const removeFile = async (name: string, collection?: string) => {
    try {
      await window.electronAPI.removeKnowledgeFile(name, collection);
      toast.success("Node removed from brain");
      loadFiles();
    } catch (error) {
      console.error("Knowledge: removal error", error);
      toast.error("Failed to remove node");
    }
  };

  const handleReveal = async (name: string, collection?: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.revealKnowledgeInExplorer(name, collection);
  };

  const handleUpdateDescription = async (id: string, description: string) => {
    if (!window.electronAPI) return;
    try {
      const updatedFiles = await window.electronAPI.updateKnowledgeDescription(id, description);
      setFiles(updatedFiles);
      toast.success("AI metadata updated");
    } catch (e) {
      toast.error("Failed to update description");
    }
  };

  const moveFile = async (fileName: string, currentCollection: string, targetCollection: string) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.moveKnowledgeFileToCollection({ 
        fileName, 
        currentCollection, 
        targetCollection 
      });
      toast.success(`Moved to ${targetCollection}`);
      loadFiles();
    } catch (e) {
      toast.error("Failed to move node");
    }
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    setActiveCategory(newCollectionName.trim());
    setNewCollectionName("");
    setNewCollectionOpen(false);
    toast.info(`Collection "${newCollectionName}" ready for files`);
  };

  const handleBrowse = async () => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    try {
      const result = await window.electronAPI.browseFiles({
        properties: ["openFile", "multiSelections"],
        filters: [
          { name: "Documents", extensions: ["md", "txt", "pdf", "docx", "json"] },
          { name: "Code", extensions: ["js", "ts", "tsx", "py", "rs", "go", "c", "cpp", "json"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });

      if (result.canceled) return;

      const isVirtual = ["all", "docs", "code", "history"].includes(activeCategory);
      const targetCollection = isVirtual ? "General" : activeCategory;

      for (const filePath of result.filePaths) {
        await window.electronAPI.addKnowledgeFileFromPath(filePath, targetCollection);
      }
      
      toast.success(`Indexed ${result.filePaths.length} file(s) into ${targetCollection}`);
      loadFiles();
    } catch (error) {
      console.error("Knowledge: browse error", error);
      toast.error("Failed to index files");
    }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === "all") return matchesSearch;
    if (activeCategory === "docs") return matchesSearch && ["md", "txt", "pdf", "docx", "html"].includes(f.extension);
    if (activeCategory === "code") return matchesSearch && ["js", "ts", "tsx", "py", "rs", "go", "json", "c", "cpp"].includes(f.extension);
    if (activeCategory === "history") return matchesSearch && new Date(f.updatedAt).getTime() > Date.now() - 86400000;
    
    return matchesSearch && f.collection === activeCategory;
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case "md": return <FileText className="size-5 text-blue-400/80" />;
      case "json": return <FileJson className="size-5 text-agent-yellow/80" />;
      case "js":
      case "ts":
      case "tsx":
      case "py":
        return <FileCode className="size-5 text-primary/80" />;
      default: return <FileText className="size-5 text-white/40" />;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "Knowledge"]}
            title="Intelligence Layer"
            subtitle="Categorized research and documentation used to ground agent sessions"
            actions={
              <div className="flex items-center gap-2">
                 <div className="flex items-center bg-surface-2 rounded-lg p-0.5 border border-border/40">
                    <button 
                      onClick={() => setViewMode("grid")}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-txt-4 hover:text-txt-3")}
                    >
                      <LayoutGrid className="size-3.5" />
                    </button>
                    <button 
                      onClick={() => setViewMode("list")}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-txt-4 hover:text-txt-3")}
                    >
                      <ListIcon className="size-3.5" />
                    </button>
                 </div>
                 <Button 
                    onClick={handleBrowse}
                    size="sm" 
                    className="h-7 px-2.5 text-xs gap-1.5"
                 >
                    <Plus className="size-[13px]" />
                    New Source
                 </Button>
              </div>
            }
          />

          <div className="flex-1 flex overflow-hidden border-t border-border">
            {/* Hierarchy Sidebar */}
            <aside className="w-60 border-r border-border flex flex-col shrink-0">
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-txt-4" />
                  <Input 
                    placeholder="Quick search..." 
                    className="pl-8 h-8 text-xs bg-surface-1 border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-txt-4 uppercase tracking-wider">Smart Filters</span>
                </div>
                <nav className="space-y-0.5 mb-6">
                  {[
                    { id: "all", label: "All Context", icon: <Database className="size-3.5" />, count: files.length },
                    { id: "docs", label: "Documentation", icon: <FileText className="size-3.5" />, count: files.filter(f => ["md", "txt", "pdf"].includes(f.extension)).length },
                    { id: "code", label: "Source Code", icon: <FileCode className="size-3.5" />, count: files.filter(f => ["js", "ts", "py", "rs"].includes(f.extension)).length },
                    { id: "history", label: "Recently Indexed", icon: <History className="size-3.5" />, count: files.filter(f => new Date(f.updatedAt).getTime() > Date.now() - 86400000).length },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors",
                        activeCategory === cat.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-txt-3 hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <span className="size-4 flex items-center justify-center opacity-70">{cat.icon}</span>
                      <span className="flex-1 text-left">{cat.label}</span>
                      <span className="text-[10px] text-txt-4 font-mono">{cat.count}</span>
                    </button>
                  ))}
                </nav>

                <div className="px-3 py-2 flex items-center justify-between border-t border-border/40 mt-2 pt-4">
                  <span className="text-[10px] font-bold text-txt-4 uppercase tracking-wider">Collections</span>
                  <button 
                    onClick={() => setNewCollectionOpen(true)}
                    className="p-1 hover:bg-surface-2 rounded text-txt-4 hover:text-primary transition-colors"
                  >
                    <FolderPlus className="size-3" />
                  </button>
                </div>
                <nav className="space-y-0.5">
                  {collections.map((col) => (
                    <button
                      key={col}
                      onClick={() => setActiveCategory(col)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors",
                        activeCategory === col
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary rounded-l-none"
                          : "text-txt-3 hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <FolderOpen className={cn("size-3.5 opacity-50", activeCategory === col && "text-primary opacity-100")} />
                      <span className="flex-1 text-left truncate">{col}</span>
                      <span className="text-[10px] text-txt-4 font-mono">
                        {files.filter(f => f.collection === col).length}
                      </span>
                    </button>
                  ))}
                  {collections.length === 0 && (
                    <div className="px-3 py-4 text-center border border-dashed border-border/40 rounded-lg mx-2 opacity-40">
                      <p className="text-[11px] leading-tight">Drop files into a collection to start.</p>
                    </div>
                  )}
                </nav>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-background relative">
              {/* Invisible Dropzone Overlay */}
              <div 
                className={cn(
                  "absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 scale-95",
                  isDragging && "pointer-events-auto opacity-100 scale-100"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                <div className="size-24 rounded-[3rem] bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center mb-6 transition-transform hover:-translate-y-2 duration-500 ease-out">
                   <Upload className="size-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Index into {activeCategory === "all" ? "General" : activeCategory}</h2>
                <p className="text-txt-3 mt-2">Files will be added to this specific collection</p>
              </div>

              <div className="px-7 py-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <span className="text-[14px] font-medium tracking-tight">Accessing local context engine...</span>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div 
                    className="flex flex-col items-center justify-center py-20 text-center rounded-[2.5rem] bg-surface-1/30 border-2 border-dashed border-border/40"
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  >
                    <div className="size-20 rounded-[2.5rem] bg-surface-2 flex items-center justify-center mb-6 border border-border shadow-xl">
                      <Upload className="size-8 text-txt-4" />
                    </div>
                    <h4 className="text-[20px] font-bold text-foreground mb-2">Build your Agent&apos;s Brain</h4>
                    <p className="text-[14px] text-txt-3 mt-1 max-w-[360px] leading-relaxed mb-10">
                      Drag and drop documentation or code here to create a shared intelligence layer for all your agents.
                    </p>
                    <Button 
                      onClick={handleBrowse}
                      className="h-10 px-8 rounded-full font-bold bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/10"
                    >
                       Browse Files
                    </Button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFiles.map((file) => (
                      <KnowledgeCard 
                        key={file.id} 
                        file={file}
                        onRemove={removeFile}
                        onReveal={handleReveal}
                        onUpdateDescription={handleUpdateDescription}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-xl border-border/40 bg-surface-1/30 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-surface-2/40">
                        <TableRow className="border-border/40 hover:bg-transparent h-10">
                          <TableHead className="text-txt-4 font-bold text-[10px] uppercase tracking-wider pl-6">Knowledge Node</TableHead>
                          <TableHead className="text-txt-4 font-bold text-[10px] uppercase tracking-wider w-[100px]">Format</TableHead>
                          <TableHead className="text-txt-4 font-bold text-[10px] uppercase tracking-wider w-[100px]">Payload</TableHead>
                          <TableHead className="text-txt-4 font-bold text-[10px] uppercase tracking-wider w-[140px]">Collection</TableHead>
                          <TableHead className="text-txt-4 font-bold text-[10px] uppercase tracking-wider w-[60px] text-right pr-6"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFiles.map((file) => (
                          <TableRow key={file.id} className="border-border/40 hover:bg-primary/[0.02] transition-all group h-14 cursor-default">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-surface-2 border border-border/60 flex items-center justify-center transition-all group-hover:bg-primary/10 group-hover:border-primary/20 shadow-sm">
                                  {getFileIcon(file.extension)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors leading-none">{file.name}</span>
                                  <span className="text-[9px] text-txt-4 font-mono tracking-tighter mt-1 opacity-60">CRC32: {file.id.slice(0, 10)}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                               <Badge variant="outline" className="rounded bg-surface-3 border-border/60 text-[9px] font-bold text-txt-3 uppercase px-1.5 h-4">
                                  {file.extension}
                               </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-[12px] text-foreground/70 font-mono font-medium">{formatSize(file.size)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="ghost" className="bg-surface-3 text-txt-4 text-[10px] border border-border/20 px-2 py-0.5 rounded-md">
                                {file.collection}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <DropdownMenu>
                                <DropdownMenuTrigger 
                                  className="inline-flex items-center justify-center size-7 p-0 text-txt-4 hover:text-foreground hover:bg-surface-2 transition-all opacity-0 group-hover:opacity-100 rounded-md"
                                >
                                  <MoreHorizontal className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-surface-1 border-border/60 text-txt-2 shadow-2xl p-1 rounded-xl backdrop-blur-xl">
                                  <DropdownMenuItem 
                                    onClick={() => handleReveal(file.name, file.collection)}
                                    className="gap-2.5 cursor-pointer py-2 rounded-lg text-[12px] font-medium"
                                  >
                                    Reveal in Explorer
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="gap-2.5 py-2 rounded-lg text-[12px] font-medium">
                                      <ArrowRightLeft className="size-3.5 opacity-50" />
                                      Move to...
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="bg-surface-1 border-border/60 p-1 rounded-xl">
                                      {["General", ...collections.filter(c => c !== file.collection)].map(target => (
                                        <DropdownMenuItem 
                                          key={target}
                                          onClick={() => moveFile(file.name, file.collection, target)}
                                          className="text-[12px] py-1.5 rounded-lg"
                                        >
                                          {target}
                                        </DropdownMenuItem>
                                      ))}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setMovingFile({ name: file.name, collection: file.collection });
                                          setNewCollectionOpen(true);
                                        }}
                                        className="text-[11px] py-1.5 rounded-lg text-primary"
                                      >
                                        + New Collection
                                      </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>

                                  <DropdownMenuSeparator className="bg-border/40" />
                                  <DropdownMenuItem 
                                    onClick={() => removeFile(file.name, file.collection)}
                                    className="text-agent-red focus:text-agent-red focus:bg-agent-red/10 gap-2.5 cursor-pointer py-2 rounded-lg text-[12px] font-bold"
                                  >
                                    Unindex Node
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* New Collection Dialog */}
      <Dialog open={newCollectionOpen} onOpenChange={setNewCollectionOpen}>
        <DialogContent className="sm:max-w-[400px] bg-surface-1 border-border/60">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Collection</DialogTitle>
            <DialogDescription className="text-txt-4">
              Enter a name for your new knowledge collection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase text-txt-4 tracking-widest">Name</Label>
              <Input
                id="name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g. Research Papers, API Docs..."
                className="h-10 bg-surface-2 border-border/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && (movingFile ? moveFile(movingFile.name, movingFile.collection, newCollectionName) : handleCreateCollection())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewCollectionOpen(false)}>Cancel</Button>
            <Button 
               disabled={!newCollectionName.trim()}
               onClick={() => {
                 if (movingFile) {
                   moveFile(movingFile.name, movingFile.collection, newCollectionName);
                   setMovingFile(null);
                 } else {
                   handleCreateCollection();
                 }
               }}
            >
              Create Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
