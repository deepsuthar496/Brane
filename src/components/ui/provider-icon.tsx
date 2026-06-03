"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useIconStore } from "@/store/icon-store";
import { getProviderNameForLogo } from "@/app/brainzo/_components/constants";
import { Bot, Cpu } from "lucide-react";
import { useTheme } from "next-themes";

interface ProviderIconProps {
  provider: string;
  modelId?: string;
  className?: string;
  forceBlack?: boolean;
}

export const ProviderIcon = ({ provider, modelId = '', className, forceBlack = false }: ProviderIconProps) => {
  const providerName = getProviderNameForLogo(provider, modelId);
  const { icons, fetchIcon } = useIconStore();
  const [error, setError] = useState(false);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'green';
  const cachedIcon = icons[providerName];

  useEffect(() => {
    let mounted = true;
    setError(false);
    if (!icons[providerName]) {
      fetchIcon(providerName).then(url => {
        if (mounted && !url) setError(true);
      });
    }
    return () => { mounted = false; };
  }, [providerName, cachedIcon, fetchIcon, error]);

  if (error || (!cachedIcon && icons[providerName] === null)) {
    return <Bot className={cn("text-foreground opacity-40", className)} />;
  }

  if (!cachedIcon) {
    // Placeholder while loading - made brighter for dark mode visibility
    return (
      <div className={cn("flex items-center justify-center animate-pulse", className)}>
        <Bot className="size-full text-foreground/10" />
      </div>
    );
  }

  // Certain logos from models.dev are pure black and disappear on dark themes.
  // We only invert if we are NOT in a forceBlack context.
  const needsInversion = !forceBlack && isDark && (
    providerName === 'openai' || 
    providerName === 'github' || 
    providerName === 'openrouter' ||
    providerName === 'groq' ||
    providerName === 'anthropic' ||
    providerName === 'cerebras'
  );

  return (
    <img 
      src={cachedIcon} 
      alt={`${providerName} logo`} 
      className={cn(
        className, 
        "transition-all duration-500",
        needsInversion ? "brightness-0 invert opacity-90" : forceBlack ? "brightness-0" : ""
      )} 
      onLoad={(e) => { e.currentTarget.style.opacity = '1' }}
      onError={() => setError(true)}
      style={{ opacity: cachedIcon ? 1 : 0 }}
    />
  );
};
