"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SessionQuestionDock({ activeQuestion, onReply, onDismiss }: { activeQuestion: any, onReply: (answer: string) => void, onDismiss: () => void }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  if (!activeQuestion?.input?.question) return null;

  const { question, options } = activeQuestion.input;

  return (
    <div className="mx-4 mb-3 bg-card border border-border rounded-xl shadow-lg flex flex-col z-10 relative mt-4">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50 bg-muted/20">
        <span className="text-xs font-semibold text-foreground">1 of 1 questions</span>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin">
        <p className="text-sm font-medium leading-relaxed">{question}</p>
        <p className="text-xs text-muted-foreground">Select one answer</p>
        <div className="space-y-2">
          {options?.map((opt: any, idx: number) => (
             <button 
               key={idx} 
               className={cn("w-full text-left p-3 border rounded-lg transition-colors flex items-start gap-3", selectedOption === opt.label ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30")}
               onClick={() => setSelectedOption(opt.label)}
             >
               <div className={cn("mt-0.5 size-4 rounded-full border flex items-center justify-center shrink-0", selectedOption === opt.label ? "border-primary" : "border-muted-foreground")}>
                  {selectedOption === opt.label && <div className="size-2 rounded-full bg-primary" />}
               </div>
               <div className="flex flex-col gap-1">
                 <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                 {opt.description && <span className="text-xs text-muted-foreground leading-relaxed">{opt.description}</span>}
               </div>
             </button>
          ))}
          <div 
            className={cn("w-full text-left p-3 border rounded-lg transition-colors flex flex-col gap-2", selectedOption === 'custom' ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30")}
            onClick={() => setSelectedOption('custom')}
          >
             <div className="flex items-center gap-3">
               <div className={cn("size-4 rounded-full border flex items-center justify-center shrink-0", selectedOption === 'custom' ? "border-primary" : "border-muted-foreground")}>
                  {selectedOption === 'custom' && <div className="size-2 rounded-full bg-primary" />}
               </div>
               <span className="text-sm font-semibold text-foreground">Type your own answer</span>
             </div>
             {selectedOption === 'custom' && (
               <div className="pl-7 pr-2 pb-1">
                 <input 
                   autoFocus
                   type="text" 
                   value={customText}
                   onChange={e => setCustomText(e.target.value)}
                   className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-sm py-1" 
                   placeholder="Type your answer..."
                   onKeyDown={e => {
                     if (e.key === 'Enter' && customText.trim()) {
                       onReply(customText);
                     }
                   }}
                 />
               </div>
             )}
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-border/50 flex justify-end bg-muted/10">
        <Button 
          disabled={!selectedOption || (selectedOption === 'custom' && !customText.trim())}
          onClick={() => {
            if (selectedOption === 'custom') {
               onReply(customText);
            } else if (selectedOption) {
               onReply(selectedOption);
            }
          }}
          size="sm"
          className="px-6"
        >
          Submit
        </Button>
      </div>
    </div>
  )
}
