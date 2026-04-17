"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Search, 
  Plus, 
  BrainCircuit, 
  Loader2, 
  MoreHorizontal,
  Info,
  ExternalLink,
  ShieldCheck,
  FileCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  updatedAt: string;
  extension: string;
}

export default function KnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    try {
      for (const file of droppedFiles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filePath = (file as any).path;
        if (filePath) {
          await window.electronAPI.addKnowledgeFileFromPath(filePath);
        } else {
          const text = await file.text();
          await window.electronAPI.addKnowledgeFile(file.name, text);
        }
      }
      toast.success(`Successfully indexed ${droppedFiles.length} file(s)`);
      loadFiles();
    } catch (error) {
      console.error("Knowledge: upload error", error);
      toast.error("Failed to index files");
    }
  };

  const removeFile = async (name: string) => {
    try {
      await window.electronAPI.removeKnowledgeFile(name);
      toast.success("File removed from knowledge base");
      loadFiles();
    } catch (error) {
      console.error("Knowledge: removal error", error);
      toast.error("Failed to remove file");
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/5 bg-surface-2/20">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BrainCircuit className="size-5 text-primary" />
                  <h1 className="text-[20px] font-semibold text-white tracking-tight">Global Knowledge</h1>
                </div>
                <p className="text-[13px] text-white/40 max-w-[600px]">
                  Drop files here to provide all agents with global context. Agents can autonomously search and read from this base using the internal MCP server.
                </p>
              </div>
              <div className="flex items-center gap-3">
                 <div className="text-right mr-2">
                    <div className="text-[14px] font-medium text-white/90">{files.length} Files</div>
                    <div className="text-[11px] text-white/30 tracking-wide uppercase font-semibold">Indexed Context</div>
                 </div>
                 <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 h-9 rounded-lg gap-2 shadow-lg shadow-primary/10">
                    <Plus className="size-4" />
                    Add Source
                 </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-[#0a0a09]">
            <div className="max-w-6xl mx-auto space-y-8">
              
              {/* Dropzone Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "relative group rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center py-12 px-6 bg-white/[0.01]",
                  isDragging 
                    ? "border-primary bg-primary/5 scale-[1.01] shadow-2xl shadow-primary/5" 
                    : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                )}
              >
                <div className="size-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500">
                  <Upload className={cn(
                    "size-7 transition-colors duration-300",
                    isDragging ? "text-primary" : "text-white/20 group-hover:text-white/40"
                  )} />
                </div>
                <h3 className="text-[16px] font-medium text-white/90 mb-1">
                  {isDragging ? "Release to Index" : "Drop files to enhance agents"}
                </h3>
                <p className="text-[13px] text-white/30 text-center max-w-[400px]">
                  Markdown, PDF, and Text files work best. These will be accessible across all active agent sessions.
                </p>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/20 group-focus-within:text-primary/60 transition-colors" />
                  <Input 
                    placeholder="Search knowledge base..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-white/[0.02] border-white/5 text-[14px] text-white/80 focus-visible:ring-primary/20 rounded-xl"
                  />
                </div>
              </div>

              {/* Knowledge Table */}
              <Card className="rounded-2xl border-white/5 bg-white/[0.01] overflow-hidden shadow-2xl">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <span className="text-[13px] font-medium">Synchronizing context...</span>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 opacity-40 border border-white/10">
                      <FileCode className="size-6 text-white" />
                    </div>
                    <h4 className="text-[15px] font-medium text-white/60">No knowledge sources found</h4>
                    <p className="text-[12px] text-white/30 mt-1 max-w-[280px]">
                      Search terms didn&apos;t match anything or index is currently empty.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-white/[0.02]">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-white/40 font-semibold h-11">Name</TableHead>
                        <TableHead className="text-white/40 font-semibold h-11 w-[120px]">Format</TableHead>
                        <TableHead className="text-white/40 font-semibold h-11 w-[120px]">Size</TableHead>
                        <TableHead className="text-white/40 font-semibold h-11 w-[180px]">Indexed At</TableHead>
                        <TableHead className="text-white/40 font-semibold h-11 w-[80px] text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow key={file.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center transition-colors group-hover:bg-primary/10 group-hover:border-primary/20">
                                <FileText className="size-4 text-white/30 group-hover:text-primary transition-colors" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-medium text-white/90 group-hover:text-white transition-colors">{file.name}</span>
                                <span className="text-[11px] text-white/20 font-mono tracking-tighter">ID: {file.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                               <div className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-white/40 uppercase">
                                  {file.extension}
                               </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-[12px] text-white/50 font-mono">{formatSize(file.size)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[12px] text-white/30">{new Date(file.updatedAt).toLocaleDateString()} at {new Date(file.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="size-8 p-0 text-white/20 hover:text-white hover:bg-white/10">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1a] border-white/10 text-white/70">
                                <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-white/5">
                                  <ExternalLink className="size-3.5" />
                                  Open File Location
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-white/5">
                                  <Info className="size-3.5" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => removeFile(file.name)}
                                  className="text-agent-red focus:text-agent-red focus:bg-agent-red/10 gap-2 cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                  Delete Index
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>

              {/* Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                   <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-5 text-primary" />
                   </div>
                   <div>
                      <h4 className="text-[15px] font-semibold text-white/90 mb-1">Local & Private</h4>
                      <p className="text-[12px] text-white/30 leading-relaxed">
                         Your global knowledge files are stored only on this device. They are not uploaded to our servers. Brane Hub encrypts access to this context.
                      </p>
                   </div>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                   <div className="size-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      <FileCode className="size-5 text-white/40" />
                   </div>
                   <div>
                      <h4 className="text-[15px] font-semibold text-white/90 mb-1">Agent Accessibility</h4>
                      <p className="text-[12px] text-white/30 leading-relaxed">
                         Agents use the internal &apos;brane-knowledge&apos; MCP server to fetch relevant snippets from these files as needed during task execution.
                      </p>
                   </div>
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
