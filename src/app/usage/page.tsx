"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Cpu, 
  TrendingUp, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Calendar,
  ChevronDown,
  Info,
  DollarSign,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Titlebar } from "@/components/layout/titlebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { agents } from "@/lib/data";

const timeframes = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days"];

export default function UsagePage() {
  const [activeTimeframe, setActiveTimeframe] = useState("Today");
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for token usage based on agents
  const usageData = useMemo(() => {
    return agents.map(agent => ({
      ...agent,
      inputTokens: Math.floor(Math.random() * 500000) + 100000,
      outputTokens: Math.floor(Math.random() * 150000) + 20000,
      totalTokens: 0, // calculated below
      cost: 0, // calculated below
      trend: Math.random() > 0.5 ? "up" : "down",
      trendValue: (Math.random() * 15).toFixed(1)
    })).map(agent => ({
      ...agent,
      totalTokens: agent.inputTokens + agent.outputTokens,
      cost: (agent.inputTokens * 0.00001 + agent.outputTokens * 0.00003).toFixed(2)
    }));
  }, []);

  const totalTokens = useMemo(() => 
    usageData.reduce((acc, curr) => acc + curr.totalTokens, 0), 
  [usageData]);

  const totalCost = useMemo(() => 
    usageData.reduce((acc, curr) => acc + parseFloat(curr.cost), 0).toFixed(2), 
  [usageData]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <PageHeader
            breadcrumbs={["Workspace", "Token Usage"]}
            title="Usage Analytics"
            subtitle="Monitor token burn rate and costs across all active agents"
            actions={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs border-border bg-surface-1">
                  <Calendar className="size-3.5 text-txt-3" />
                  {activeTimeframe}
                  <ChevronDown className="size-3.5 text-txt-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-xs border-border bg-surface-1">
                  <Filter className="size-3.5 text-txt-3" />
                  Filter
                </Button>
              </div>
            }
          />

          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 scrollbar-none">
            {/* Top Bento Row: Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-surface-1/40 border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap className="size-12 text-primary" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-txt-4">Total Tokens</CardDescription>
                  <CardTitle className="text-2xl font-black tracking-tight">{(totalTokens / 1000).toFixed(1)}k</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-agent-green">
                    <ArrowUpRight className="size-3" />
                    <span>12.5% from yesterday</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-1/40 border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign className="size-12 text-agent-blue" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-txt-4">Estimated Cost</CardDescription>
                  <CardTitle className="text-2xl font-black tracking-tight">${totalCost}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-agent-red">
                    <ArrowUpRight className="size-3" />
                    <span>$2.40 increase</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-1/40 border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity className="size-12 text-agent-purple" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-txt-4">Active Session</CardDescription>
                  <CardTitle className="text-2xl font-black tracking-tight">42m</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-agent-green">
                    <ArrowDownRight className="size-3" />
                    <span>8% less than avg</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-1/40 border-border/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BarChart3 className="size-12 text-agent-orange" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-txt-4">Avg. Context</CardDescription>
                  <CardTitle className="text-2xl font-black tracking-tight">24.1k</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-txt-3">
                    <Clock className="size-3" />
                    <span>Stable per turn</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Bento Row: Main Charts / Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent Breakdown Table */}
              <Card className="lg:col-span-2 border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-base font-bold">Agent Breakdown</CardTitle>
                    <CardDescription className="text-xs">Token usage split by individual agent sessions</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8">
                    <PieChart className="size-4 text-txt-3" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  <Table>
                    <TableHeader className="bg-surface-2/50">
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="w-[200px] text-[10px] uppercase font-bold tracking-wider h-10">Agent</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider h-10">Usage</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider h-10">Cost</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-wider h-10 text-right">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageData.map((agent) => (
                        <TableRow key={agent.id} className="border-border/20 hover:bg-surface-2/30 transition-colors">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("size-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm", agent.colorClass)}>
                                {agent.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[13px] font-semibold">{agent.name}</span>
                                <span className="text-[10px] text-txt-4 font-medium uppercase tracking-tight">{agent.provider}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 w-full max-w-[120px]">
                              <div className="flex justify-between text-[11px] font-medium">
                                <span className="text-txt-3">{(agent.totalTokens / 1000).toFixed(1)}k tokens</span>
                                <span className="text-txt-4">82%</span>
                              </div>
                              <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full rounded-full transition-all duration-1000", agent.colorClass)}
                                  style={{ width: `${Math.floor(Math.random() * 60) + 30}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] font-mono font-medium">${agent.cost}</TableCell>
                          <TableCell className="text-right">
                            <div className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full",
                              agent.trend === "up" ? "bg-agent-red-dim text-agent-red" : "bg-agent-green-dim text-agent-green"
                            )}>
                              {agent.trend === "up" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                              {agent.trendValue}%
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Insights Column */}
              <div className="space-y-6">
                <Card className="border-border/40 bg-surface-1/20 shadow-none">
                  <CardHeader className="pb-3">
                    <div className="size-8 rounded-lg bg-agent-orange/10 flex items-center justify-center mb-2">
                      <TrendingUp className="size-4 text-agent-orange" />
                    </div>
                    <CardTitle className="text-base font-bold">Efficiency Alert</CardTitle>
                    <CardDescription className="text-xs">Context window usage is 2.4x higher on Claude Code compared to previous week.</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0">
                    <Button variant="link" size="sm" className="h-auto p-0 text-[11px] text-agent-orange gap-1">
                      View full report <ArrowRight className="size-3" />
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-border/40 bg-surface-1/20 shadow-none">
                  <CardHeader className="pb-3">
                    <div className="size-8 rounded-lg bg-agent-blue/10 flex items-center justify-center mb-2">
                      <Zap className="size-4 text-agent-blue" />
                    </div>
                    <CardTitle className="text-base font-bold">Provider Swap Suggestion</CardTitle>
                    <CardDescription className="text-xs">Switching Gemini 2.0 tasks to Flash could save an estimated $12.50 today.</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-0">
                    <Button variant="link" size="sm" className="h-auto p-0 text-[11px] text-agent-blue gap-1">
                      Optimize now <ArrowRight className="size-3" />
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-border/40 bg-agent-purple/5 border-dashed relative overflow-hidden flex flex-col justify-center items-center py-8 px-4 text-center">
                   <div className="size-10 rounded-full bg-agent-purple/10 flex items-center justify-center mb-3">
                      <PieChart className="size-5 text-agent-purple" />
                   </div>
                   <h4 className="text-sm font-bold mb-1">Weekly Reports</h4>
                   <p className="text-[11px] text-txt-3 max-w-[180px]">Upgrade to Brane Pro for detailed CSV exports and multi-team usage analytics.</p>
                   <Button size="sm" className="mt-4 h-8 px-6 text-xs bg-agent-purple hover:bg-agent-purple/90 text-white rounded-full">
                     Coming Soon
                   </Button>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}
