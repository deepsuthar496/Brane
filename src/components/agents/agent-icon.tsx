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

  if (isIconify) {
    return <Icon icon={icon} className={cn("size-full", className)} />;
  }

  // Fallback to emoji/text
  return <span className={cn("text-xs", className)}>{icon}</span>;
}
