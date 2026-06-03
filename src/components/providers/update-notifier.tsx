"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, Check } from "lucide-react";

export function UpdateNotifier() {
  const downloadingToastId = useRef<string | number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;

    // Listen for updates available
    const unsubAvailable = window.electronAPI.onUpdateAvailable((info: any) => {
      console.log("[UpdateNotifier] Update available:", info);
      const toastId = toast.custom((t) => (
        <div className="flex flex-col gap-2.5 p-4 bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-xl w-[320px] text-left">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
              <Download className="size-3.5 text-primary" />
              Downloading Update
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/90 leading-normal">
            Version v{info.version} is available and downloading in the background.
          </p>
        </div>
      ), { duration: 6000 });
      downloadingToastId.current = toastId;
    });

    // Listen for updates downloaded and ready
    const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info: any) => {
      console.log("[UpdateNotifier] Update downloaded:", info);
      
      // Dismiss the downloading toast if open
      if (downloadingToastId.current) {
        toast.dismiss(downloadingToastId.current);
      }

      // Display the final relaunch popup
      toast.custom((t) => (
        <div className="flex flex-col gap-2.5 p-4 bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-xl w-[320px] text-left">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              Update Ready to Install
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/90 leading-normal">
            Brane Hub has been updated to v{info.version}! Relaunch the application now to apply the changes.
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Button 
              size="sm" 
              onClick={() => {
                toast.dismiss(t);
                window.electronAPI.restartAndInstall();
              }}
              className="h-7 px-3 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg hover:bg-primary/95"
            >
              Relaunch Now
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => toast.dismiss(t)}
              className="h-7 px-3 text-[11px] font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground"
            >
              Later
            </Button>
          </div>
        </div>
      ), { duration: Infinity }); // Persist until user acts
    });

    // Listen for update errors
    const unsubError = window.electronAPI.onUpdateError((err: string) => {
      console.error("[UpdateNotifier] Update error:", err);
      if (downloadingToastId.current) {
        toast.dismiss(downloadingToastId.current);
      }
    });

    // Listen for warnings (e.g. missing GitHub token)
    const unsubWarning = window.electronAPI.onUpdateWarning?.((msg: string) => {
      console.warn("[UpdateNotifier] Update warning:", msg);
      toast.warning("Auto-Updater Warning", {
        description: msg,
        duration: 8000,
      });
    });

    return () => {
      unsubAvailable();
      unsubDownloaded();
      unsubError();
      if (unsubWarning) unsubWarning();
    };
  }, []);

  return null;
}
