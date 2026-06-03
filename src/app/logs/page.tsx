"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Trash2, 
  RefreshCcw, 
  Filter, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Bug,
  Terminal
} from "lucide-react";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogEntry } from "@/types/electron";
import { cn } from "@/lib/utils";

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      if (typeof window !== "undefined" && window.electronAPI) {
        const fetchedLogs = await window.electronAPI.getLogs();
        // Sort by timestamp descending
        setLogs(fetchedLogs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const clearLogs = async () => {
    if (confirm("Are you sure you want to clear all logs?")) {
      try {
        if (window.electronAPI) {
          await window.electronAPI.clearLogs();
          setLogs([]);
        }
      } catch (err) {
        console.error("Failed to clear logs:", err);
      }
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = 
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details && typeof log.details === "string" && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesLevel = levelFilter === "all" || log.level === levelFilter;
      
      return matchesSearch && matchesLevel;
    });
  }, [logs, searchQuery, levelFilter]);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "info":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1.5"><Info className="size-3" /> Info</Badge>;
      case "warn":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1.5"><AlertTriangle className="size-3" /> Warning</Badge>;
      case "error":
        return <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1.5"><XCircle className="size-3" /> Error</Badge>;
      case "debug":
        return <Badge variant="secondary" className="bg-slate-500/10 text-slate-500 border-slate-500/20 gap-1.5"><Bug className="size-3" /> Debug</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "Logs"]}
            title="System Logs"
            subtitle="Monitor background processes, CLI activity, and system events."
            actions={
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchLogs(true)}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCcw className={cn("size-3.5", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearLogs}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  <Trash2 className="size-3.5" />
                  Clear
                </Button>
              </>
            }
          />

          <div className="px-7 py-6 flex flex-col flex-1 overflow-hidden">
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by message, source, or details..."
                  className="pl-9 h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={levelFilter} onValueChange={(val) => setLevelFilter(val || "all")}>
                <SelectTrigger className="w-[180px] h-10">
                  <div className="flex items-center gap-2">
                    <Filter className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="All Levels" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Logs Table */}
            <div className="flex-1 border rounded-xl overflow-hidden bg-surface-1/50">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader className="bg-surface-2/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[120px]">Level</TableHead>
                      <TableHead className="w-[150px]">Source</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCcw className="size-4 animate-spin" />
                            Loading logs...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          No logs found matching your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id} className="group transition-colors">
                          <TableCell className="font-mono text-[11px] text-txt-3 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {getLevelBadge(log.level)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-[13px] text-foreground/80">{log.source}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] text-foreground leading-relaxed">{log.message}</span>
                              {!!log.details && (
                                <div className="mt-1 p-2 rounded bg-surface-3/50 border border-border/40 font-mono text-[11px] text-muted-foreground break-all">
                                  {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Status Footer */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-txt-3 px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Terminal className="size-3" />
                  Total logs: {logs.length}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-green-500" />
                  Logging system active
                </span>
              </div>
              <span>Showing {filteredLogs.length} matching entries</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function CheckCircle2({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide lucide-check-circle-2", className)}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
