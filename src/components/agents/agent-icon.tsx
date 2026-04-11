"use client";

import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface AgentIconProps {
  icon: string;
  className?: string;
}

export function AgentIcon({ icon, className }: AgentIconProps) {
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
