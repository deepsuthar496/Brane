"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  X, 
  Search, 
  Terminal as TerminalIcon, 
  Zap, 
  Eraser, 
  Maximize2, 
  Minimize2,
  ChevronUp,
  ChevronDown,
  RefreshCw
} from "lucide-react";

interface XTerminalProps {
  agentId: string;
  isRunning: boolean;
  onData?: (data: string) => void;
}

export const XTerminal = ({ agentId, isRunning, onData }: XTerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const syncDimensions = useCallback(() => {
    if (xtermRef.current && fitAddonRef.current && window.electronAPI) {
      try {
        fitAddonRef.current.fit();
        window.electronAPI.resizeAgent({
          id: agentId,
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows
        }).catch(() => {});
      } catch (e) {
        console.warn("XTerminal: Failed to sync dimensions", e);
      }
    }
  }, [agentId]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#0c0c0b",
        foreground: "#f2f2f2",
        cursor: "#f2f2f2",
        cursorAccent: "#0c0c0b",
        selectionBackground: "rgba(255, 255, 255, 0.2)",
        black: "#000000",
        red: "#ff5c57",
        green: "#5af78e",
        yellow: "#f3f99d",
        blue: "#57c7ff",
        magenta: "#ff6ac1",
        cyan: "#9aedfe",
        white: "#f2f2f2",
      },
      allowTransparency: true,
      scrollback: 5000,
      windowOptions: {
        fullscreenWin: true
      }
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(webLinksAddon);
    
    const initTerminal = () => {
      // Check if container is ready and has height
      if (terminalRef.current && terminalRef.current.offsetHeight > 10) {
        try {
          term.open(terminalRef.current);
          fitAddon.fit();
          
          xtermRef.current = term;
          fitAddonRef.current = fitAddon;
          searchAddonRef.current = searchAddon;
          setIsReady(true);
          
          // Force a sync after layout settles
          setTimeout(() => syncDimensions(), 200);
          
          term.writeln("\x1b[1;34m[*] Brane Hub Terminal Engine Active\x1b[0m");
          term.writeln("\x1b[2mInteractive Shell ready for input...\x1b[0m\r\n");
          return true;
        } catch (e) {
          console.error("XTerminal: Failed to open terminal", e);
          return false;
        }
      }
      return false;
    };

    // Retry initialization if DOM is not ready
    let retryInterval: NodeJS.Timeout;
    if (!initTerminal()) {
      let retries = 0;
      retryInterval = setInterval(() => {
        if (initTerminal() || retries > 20) {
          clearInterval(retryInterval);
        }
        retries++;
      }, 100);
    }

    // Dynamic resize sync with debouncing
    let resizeTimeout: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (xtermRef.current && terminalRef.current && terminalRef.current.offsetHeight > 0) {
          syncDimensions();
        }
      }, 100);
    });
    resizeObserver.observe(terminalRef.current);

    term.onData((data) => {
      if (isRunning && onData) {
        onData(data);
      }
    });

    return () => {
      if (retryInterval) clearInterval(retryInterval);
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      setIsReady(false);
    };
  }, [agentId, isRunning, onData, syncDimensions]); 

  // Agent log listener
  useEffect(() => {
    if (!isReady || !window.electronAPI) return;

    const cleanup = window.electronAPI.onAgentLog(agentId, (payload: any) => {
      if (xtermRef.current && isReady) {
        xtermRef.current.write(payload.data);
      }
    });

    const statusCleanup = window.electronAPI.onAgentStatus(agentId, (payload: any) => {
      if (payload.status === 'stopped' && xtermRef.current && isReady) {
        xtermRef.current.writeln("\r\n\x1b[1;31m[System] Agent process terminated.\x1b[0m");
      }
    });

    return () => {
      cleanup();
      statusCleanup();
    };
  }, [agentId, isReady]);

  // Terminal Actions
  const handleCtrlC = () => {
    if (isRunning && onData) onData("\x03");
  };

  const handleClear = () => {
    xtermRef.current?.clear();
    xtermRef.current?.reset();
    syncDimensions();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      searchAddonRef.current?.findNext(searchQuery);
    }
  };

  return (
    <div className={cn(
      "flex flex-col bg-[#0c0c0b] overflow-hidden shadow-2xl transition-all duration-300 relative",
      isMaximized ? "fixed inset-4 z-50 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-border/50" : "h-full w-full border-t border-border/40"
    )}>
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a18] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 mr-2">
            <div className="size-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
            <div className="size-2.5 rounded-full bg-amber-500/20 border border-amber-500/30" />
            <div className="size-2.5 rounded-full bg-green-500/20 border border-green-500/30" />
          </div>
          <span className="text-[10px] font-bold text-txt-4 uppercase tracking-widest font-mono flex items-center gap-2">
            <TerminalIcon className="size-3 text-primary/60" />
            Terminal PTY
          </span>
          
          {isRunning && (
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-tight">Interactive</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {searchOpen && (
            <form onSubmit={handleSearch} className="flex items-center gap-1 mr-2 animate-in fade-in slide-in-from-right-2">
              <Input 
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-6 w-40 bg-background/50 border-border/30 text-[11px] px-2 focus-visible:ring-primary/30"
              />
              <Button type="button" variant="ghost" size="icon" className="size-6 hover:bg-white/5" onClick={() => searchAddonRef.current?.findPrevious(searchQuery)}>
                <ChevronUp className="size-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-6 hover:bg-white/5" onClick={() => searchAddonRef.current?.findNext(searchQuery)}>
                <ChevronDown className="size-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-6 text-txt-4 hover:text-foreground" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                <X className="size-3" />
              </Button>
            </form>
          )}

          {!searchOpen && (
            <Button variant="ghost" size="icon" className="size-7 text-txt-4 hover:text-foreground hover:bg-white/5" title="Search" onClick={() => setSearchOpen(true)}>
              <Search className="size-3.5" />
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="size-7 text-txt-4 hover:text-primary hover:bg-white/5" 
            title="Recalculate Layout" 
            onClick={syncDimensions}
          >
            <RefreshCw className="size-3.5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="size-7 text-txt-4 hover:text-red-400 hover:bg-red-400/5" 
            title="Interrupt (Ctrl+C)" 
            onClick={handleCtrlC}
            disabled={!isRunning}
          >
            <Zap className="size-3.5" />
          </Button>

          <Button variant="ghost" size="icon" className="size-7 text-txt-4 hover:text-foreground hover:bg-white/5" title="Clear Screen" onClick={handleClear}>
            <Eraser className="size-3.5" />
          </Button>

          <Button variant="ghost" size="icon" className="size-7 text-txt-4 hover:text-foreground hover:bg-white/5" title={isMaximized ? "Minimize" : "Maximize"} onClick={() => setIsMaximized(!isMaximized)}>
            {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 overflow-hidden relative" onClick={() => xtermRef.current?.focus()}>
        <div 
          ref={terminalRef} 
          className="absolute inset-0 p-3 selection:bg-primary/30" 
        />
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0c0b] z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
            <span className="text-[10px] text-txt-4 uppercase tracking-[0.2em] font-bold animate-pulse">Initializing PTY Engine</span>
          </div>
        )}
      </div>

      {/* Subtle bottom edge */}
      <div className="h-0.5 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 shrink-0" />
      
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-primary/[0.02] opacity-50" />
    </div>
  );
};
