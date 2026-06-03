"use client";

import { cn } from "@/lib/utils";
import type { FileUIPart } from "ai";
import { XIcon, FileIcon, ImageIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

const AttachmentsContext = React.createContext<{
  data: FileUIPart & { id: string };
  onRemove?: (id: string) => void;
} | null>(null);

function useAttachment() {
  const context = React.useContext(AttachmentsContext);
  if (!context) {
    throw new Error("useAttachment must be used within an Attachment");
  }
  return context;
}

export interface AttachmentsProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "inline" | "block";
}

export const Attachments = ({
  className,
  variant = "inline",
  ...props
}: AttachmentsProps) => {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        variant === "inline" ? "flex-row" : "flex-col",
        className
      )}
      {...props}
    />
  );
};

export interface AttachmentProps extends React.HTMLAttributes<HTMLDivElement> {
  data: FileUIPart & { id: string };
  onRemove?: (id: string) => void;
}

export const Attachment = ({
  data,
  onRemove,
  className,
  children,
  ...props
}: AttachmentProps) => {
  return (
    <AttachmentsContext.Provider value={{ data, onRemove }}>
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-lg border bg-muted/50 p-1.5 pr-8 transition-colors hover:bg-muted",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentsContext.Provider>
  );
};

export const AttachmentPreview = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { data } = useAttachment();
  const isImage = data.mediaType?.startsWith("image/");

  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded bg-background overflow-hidden",
        className
      )}
      {...props}
    >
      {isImage && data.url ? (
        <img
          src={data.url}
          alt={data.filename}
          className="size-full object-cover"
        />
      ) : (
        <FileIcon className="size-4 text-muted-foreground" />
      )}
    </div>
  );
};

export const AttachmentRemove = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => {
  const { data, onRemove } = useAttachment();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "absolute right-1 top-1/2 size-6 -translate-y-1/2 rounded-full",
        className
      )}
      onClick={() => onRemove?.(data.id)}
      {...props}
    >
      <XIcon className="size-3" />
      <span className="sr-only">Remove</span>
    </Button>
  );
};

export const AttachmentInfo = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { data } = useAttachment();

  return (
    <div className={cn("flex flex-col min-w-0", className)} {...props}>
      <span className="truncate text-xs font-medium">{data.filename}</span>
      {data.mediaType && (
        <span className="truncate text-[10px] text-muted-foreground">
          {data.mediaType}
        </span>
      )}
    </div>
  );
};
