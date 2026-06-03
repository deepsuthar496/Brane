"use client";

import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

// Dynamically import react-force-graph-2d to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface CodebaseGraphProps {
  fileTree: any[];
  onNodeClick?: (nodeId: string, type: string) => void;
}

export function CodebaseGraph({ fileTree, onNodeClick }: CodebaseGraphProps) {
  const { resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(true);
  
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    setMounted(true);
    
    // Simulate neuron synthesis progress for a polished feel
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setIsSynthesizing(false), 500);
      }
      setLoadingProgress(Math.floor(progress));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  // Update dimensions when container resizes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Convert fileTree to string to prevent frequent re-calculations on polling
  const fileTreeStr = JSON.stringify(fileTree);

  // Adjust physics forces for a breathable, non-cluttered layout
  useEffect(() => {
    if (fgRef.current) {
      // Increase repulsion (charge) to push nodes far apart
      fgRef.current.d3Force('charge').strength(-500);
      
      // Increase link distance to create longer "branches"
      fgRef.current.d3Force('link').distance(120);
      
      // Add a collision force to strictly prevent dots from overlapping
      // We can use the existing d3 instance from the graph engine
      fgRef.current.d3Force('collide', (d3: any) => d3.forceCollide(20));
      
      // Center the graph
      fgRef.current.d3Force('center').strength(0.1);
      
      fgRef.current.d3ReheatSimulation();
    }
  }, [fileTreeStr]);

  const graphData = useMemo(() => {
    const stableTree = JSON.parse(fileTreeStr);
    const nodes: any[] = [];
    const links: any[] = [];
    
    const IGNORED_FOLDERS = ['.git', 'node_modules', '.next', 'dist', 'build', 'out'];

    const processItem = (item: any, parentId: string) => {
      // Filter out noisy directories that cause lag
      if (IGNORED_FOLDERS.includes(item.name)) return;

      const isDir = item.type === "directory";
      nodes.push({
        id: item.id,
        name: item.name,
        type: item.type,
        // Match the image: smaller dots for files, slightly larger for folders
        val: isDir ? 4 : 2,
        color: isDir
          ? (isDark ? '#6366f1' : '#4f46e5') // Indigo for folders (neurons)
          : (isDark ? '#94a3b8' : '#64748b'), // Slate for files
      });

      links.push({
        source: parentId,
        target: item.id,
      });

      if (isDir && item.children) {
        item.children.forEach((child: any) => processItem(child, item.id));
      }
    };

    const rootId = "__workspace_root__";
    nodes.push({
      id: rootId,
      name: "Brain Core",
      type: "directory",
      val: 12, // Central large node like the image
      color: isDark ? '#a855f7' : '#9333ea', // Purple core
    });

    stableTree.forEach((item: any) => processItem(item, rootId));

    return { nodes, links };
  }, [fileTreeStr, isDark]);

  const handleNodeClick = useCallback(
    (node: any) => {
      // Zoom in on the clicked node
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(8, 2000);
      }
      
      if (node.id !== "__workspace_root__" && onNodeClick) {
        onNodeClick(node.id, node.type);
      }
    },
    [onNodeClick]
  );

  return (
    <div ref={containerRef} className="w-full h-full bg-transparent overflow-hidden relative">
      {/* Loading Overlay */}
      {isSynthesizing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-opacity duration-500">
          <div className="w-64 space-y-4 text-center">
            <div className="relative size-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" 
                style={{ animationDuration: '0.8s' }}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">Synthesizing Neurons</h3>
              <p className="text-xs text-muted-foreground">Mapping codebase structure...</p>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              {loadingProgress}% Loaded
            </div>
          </div>
        </div>
      )}

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel={(node: any) => {
          const isDir = node.type === 'directory' || node.id === '__workspace_root__';
          return `
            <div style="background: ${isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)'}; color: ${isDark ? '#fff' : '#000'}; padding: 6px 10px; border-radius: 6px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};">
              <span style="font-size: 14px; margin-right: 4px;">${isDir ? '📁' : '📄'}</span>
              <strong>${node.name}</strong>
            </div>
          `;
        }}
        nodeColor={(node: any) => node.color}
        nodeRelSize={4}
        onNodeClick={handleNodeClick}
        linkColor={() => isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'}
        linkWidth={1}
        
        // PERFORMANCE OPTIMIZATIONS
        warmupTicks={500} // Significant warmup to ensure breathable layout settles
        cooldownTicks={1}   // Freeze for zero lag after warmup
        d3AlphaDecay={0.01} // Even slower, smoother settlement
        enableNodeDrag={true}
        enablePanInteraction={true}
        enableZoomInteraction={true}
      />
    </div>
  );
}
