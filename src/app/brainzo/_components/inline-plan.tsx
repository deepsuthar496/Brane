"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanTrigger,
  PlanContent,
  PlanFooter,
  PlanAction,
} from "@/components/ai-elements/plan";

export function InlinePlan({ part, onApprove, onReject }: { part: any, onApprove: () => void, onReject: () => void }) {
  const input = typeof part.input === 'string' ? JSON.parse(part.input) : (part.input || {});
  const { title, summary, steps } = input;
  
  if (!summary) return null;

  const state = part.state || 'input-available';
  const isDone = state === 'output-available' || state === 'output-error';

  return (
    <div className="w-full my-4 z-10 relative">
      <Plan isStreaming={false} defaultOpen={!isDone}>
        <PlanHeader>
          <PlanTitle>{title || "Execution Plan"}</PlanTitle>
          <PlanDescription>{isDone ? "Implementation plan resolved." : "Please review the implementation plan."}</PlanDescription>
          <PlanTrigger />
        </PlanHeader>
        <PlanContent>
          <div className="text-sm text-foreground/90 whitespace-pre-wrap mb-4">
            <Markdown content={summary} />
          </div>
          {steps && steps.length > 0 && (
            <div className="space-y-3 mt-4 border-t border-border pt-4">
              <h4 className="text-xs font-semibold text-foreground">Steps:</h4>
              {steps.map((step: any, idx: number) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5 flex items-center justify-center size-5 rounded-full bg-muted text-[10px] font-medium border border-border">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{step.title}</div>
                    {step.description && <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PlanContent>
        {!isDone && (
          <PlanFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onReject}>
              Reject Plan
            </Button>
            <PlanAction onClick={onApprove}>
              Approve & Execute
            </PlanAction>
          </PlanFooter>
        )}
      </Plan>
    </div>
  )
}
