"use client";

import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIconStore } from "@/store/icon-store";

interface AgentIconProps {
  icon: string;
  className?: string;
}

export function AgentIcon({ icon, className }: AgentIconProps) {
  const { icons, fetchIcon } = useIconStore();
  
  const isModelsDev = icon.startsWith("models-dev:");
  const providerName = isModelsDev ? icon.replace("models-dev:", "") : "";
  
  const [dataUrl, setDataUrl] = useState<string | null>(
    isModelsDev ? icons[providerName] || null : null
  );

  useEffect(() => {
    let mounted = true;
    if (isModelsDev) {
      if (!icons[providerName]) {
        fetchIcon(providerName).then(url => {
          if (mounted && url) {
            setDataUrl(url);
          }
        });
      } else {
        setDataUrl(icons[providerName]);
      }
    }
    return () => { mounted = false; };
  }, [isModelsDev, providerName, icons, fetchIcon]);

  // Handle models.dev provider icons using the cached data URL
  if (icon.startsWith("models-dev:")) {
    if (!dataUrl) {
      return <div className={cn("bg-muted/10 animate-pulse", className)} />;
    }

    return (
      <div 
        style={{ 
          maskImage: `url(${dataUrl})`,
          WebkitMaskImage: `url(${dataUrl})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center'
        }}
        className={cn("bg-current", className)}
      />
    );
  }

  // Check if the icon string is an Iconify name (usually contains a colon)
  const isIconify = icon.includes(":");
  
  // If it's a common Lucide icon name (alphanumeric, no colon), assume lucide: prefix
  const isLucideCandidate = /^[A-Z][a-zA-Z0-9]*$/.test(icon);

  if (isIconify) {
    return <Icon icon={icon} className={cn("size-full", className)} />;
  }
  
  if (isLucideCandidate) {
    return <Icon icon={`lucide:${icon.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`} className={cn("size-full", className)} />;
  }

  // Fallback to emoji/text
  return <span className={cn("text-xs", className)}>{icon}</span>;
}
