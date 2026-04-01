"use client";

import { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillEntry } from "@/lib/registry";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  skill: SkillEntry;
  isInstalled: boolean;
  onInstall?: (skill: SkillEntry) => Promise<void>;
}

export function SkillCard({ skill, isInstalled, onInstall }: SkillCardProps) {
  const [installing, setInstalling] = useState(false);

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstalled || installing || !onInstall) return;
    
    setInstalling(true);
    try {
      await onInstall(skill);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card className="flex flex-col h-full hover:border-primary/50 transition-colors group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="size-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-[20px] shrink-0">
            {skill.icon}
          </div>
          {isInstalled && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1 px-1.5 py-0">
              <Check className="size-3" />
              Installed
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <CardTitle className="text-[15px] font-semibold leading-tight">{skill.name}</CardTitle>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] text-txt-3 font-medium">v{skill.version}</span>
            <span className="text-[11px] text-txt-4">•</span>
            <span className="text-[11px] text-txt-3 font-medium">{skill.author}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4 flex-1">
        <CardDescription className="text-[13px] leading-relaxed line-clamp-2 min-h-[40px]">
          {skill.description}
        </CardDescription>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {skill.tags.map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[10px] text-txt-3">
              {tag}
            </span>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          variant={isInstalled ? "outline" : "default"} 
          size="sm" 
          className={cn(
            "w-full h-8 text-xs font-medium gap-1.5 transition-all",
            isInstalled && "bg-transparent text-foreground/50 hover:bg-transparent cursor-default border-border"
          )}
          onClick={handleInstall}
          disabled={isInstalled || installing}
        >
          {installing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Installing...
            </>
          ) : isInstalled ? (
            <>
              <Check className="size-3.5" />
              Installed
            </>
          ) : (
            <>
              <Download className="size-3.5" />
              Install Skill
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
