"use client";

import { ComponentProps, HTMLAttributes, ReactNode, useCallback, useState, Children } from "react";
import { 
  PlusIcon, 
  ImageIcon, 
  Monitor, 
  CornerDownLeftIcon, 
  SquareIcon, 
  XIcon, 
  ChevronDown 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  InputGroupAddon, 
  InputGroupButton, 
  InputGroupTextarea 
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import type { ChatStatus } from "ai";
import { captureScreenshot } from "./utils";
import { 
  usePromptInputAttachments, 
  useOptionalPromptInputController, 
  usePromptInputReferencedSources 
} from "./context";

// ============================================================================
// Action Buttons & Menus
// ============================================================================

export type PromptInputButtonTooltip = string | {
  content: ReactNode;
  shortcut?: string;
  side?: ComponentProps<typeof TooltipContent>["side"];
};

export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton> & {
  tooltip?: PromptInputButtonTooltip;
};

export const PromptInputButton = ({
  variant = "ghost",
  className,
  size,
  tooltip,
  ...props
}: PromptInputButtonProps) => {
  const newSize = size ?? (Children.count(props.children) > 1 ? "sm" : "icon-sm");
  const button = (
    <InputGroupButton className={cn(className)} size={newSize} type="button" variant={variant} {...props} />
  );

  if (!tooltip) return button;

  const tooltipContent = typeof tooltip === "string" ? tooltip : tooltip.content;
  const shortcut = typeof tooltip === "string" ? undefined : tooltip.shortcut;
  const side = typeof tooltip === "string" ? "top" : (tooltip.side ?? "top");

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side={side}>
        {tooltipContent}
        {shortcut && <span className="ml-2 text-muted-foreground">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
};

export const PromptInputAddAttachmentsButton = ({
  className,
  tooltip = "Add photos or files",
  ...props
}: PromptInputButtonProps) => {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton className={className} onClick={() => attachments.openFileDialog()} tooltip={tooltip} {...props}>
      <PlusIcon className="size-4" />
    </PromptInputButton>
  );
};

export const PromptInputActionAddAttachments = ({
  label = "Add photos or files",
  ...props
}: ComponentProps<typeof DropdownMenuItem> & { label?: string }) => {
  const attachments = usePromptInputAttachments();
  const handleSelect = useCallback((e: any) => {
    e.preventDefault();
    attachments.openFileDialog();
  }, [attachments]);

  return (
    <DropdownMenuItem {...props} onSelect={handleSelect}>
      <ImageIcon className="mr-2 size-4" /> {label}
    </DropdownMenuItem>
  );
};

export const PromptInputActionAddScreenshot = ({
  label = "Take screenshot",
  onSelect,
  ...props
}: ComponentProps<typeof DropdownMenuItem> & { label?: string }) => {
  const attachments = usePromptInputAttachments();
  const handleSelect = useCallback(async (event: any) => {
    onSelect?.(event);
    if (event.defaultPrevented) return;
    try {
      const screenshot = await captureScreenshot();
      if (screenshot) attachments.add([screenshot]);
    } catch (error) {
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError")) return;
      throw error;
    }
  }, [onSelect, attachments]);

  return (
    <DropdownMenuItem {...props} onSelect={handleSelect}>
      <Monitor className="mr-2 size-4" /> {label}
    </DropdownMenuItem>
  );
};

// ============================================================================
// Layout Parts
// ============================================================================

export const PromptInputBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("contents", className)} {...props} />
);

export const PromptInputHeader = ({ className, ...props }: Omit<ComponentProps<typeof InputGroupAddon>, "align">) => (
  <InputGroupAddon align="block-end" className={cn("order-first flex-wrap gap-1", className)} {...props} />
);

export const PromptInputFooter = ({ className, ...props }: Omit<ComponentProps<typeof InputGroupAddon>, "align">) => (
  <InputGroupAddon align="block-end" className={cn("justify-between gap-1", className)} {...props} />
);

export const PromptInputTools = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex min-w-0 items-center gap-1", className)} {...props} />
);

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
  onStop?: () => void;
};

export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon-sm",
  status,
  onStop,
  onClick,
  children,
  ...props
}: PromptInputSubmitProps) => {
  const isGenerating = status === "submitted" || status === "streaming";
  let Icon = <CornerDownLeftIcon className="size-4" />;
  if (status === "submitted") Icon = <Spinner />;
  else if (status === "streaming") Icon = <SquareIcon className="size-4" />;
  else if (status === "error") Icon = <XIcon className="size-4" />;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isGenerating && onStop) {
        e.preventDefault();
        onStop();
        return;
      }
      onClick?.(e as any);
    },
    [isGenerating, onStop, onClick]
  );

  return (
    <InputGroupButton
      aria-label={isGenerating ? "Stop" : "Submit"}
      className={cn(className)}
      onClick={handleClick}
      size={size}
      type={isGenerating && onStop ? "button" : "submit"}
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </InputGroupButton>
  );
};

// ============================================================================
// Wrapped UI Primitives
// ============================================================================

export const PromptInputActionMenu = (props: ComponentProps<typeof DropdownMenu>) => <DropdownMenu {...props} />;

export const PromptInputActionMenuTrigger = ({ className, children, ...props }: PromptInputButtonProps) => (
  <DropdownMenuTrigger render={<PromptInputButton className={className} {...props} />}>
    {children ?? <PlusIcon className="size-4" />}
  </DropdownMenuTrigger>
);

export const PromptInputActionMenuContent = ({ className, ...props }: ComponentProps<typeof DropdownMenuContent>) => (
  <DropdownMenuContent align="start" className={cn(className)} {...props} />
);

export const PromptInputActionMenuItem = ({ className, ...props }: ComponentProps<typeof DropdownMenuItem>) => (
  <DropdownMenuItem className={cn(className)} {...props} />
);

export const PromptInputSelect = (props: ComponentProps<typeof Select>) => <Select {...props} />;

export const PromptInputSelectTrigger = ({ className, ...props }: ComponentProps<typeof SelectTrigger>) => (
  <SelectTrigger
    className={cn(
      "border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors",
      "hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
      className
    )}
    {...props}
  />
);

export const PromptInputSelectContent = ({ className, ...props }: ComponentProps<typeof SelectContent>) => (
  <SelectContent className={cn(className)} {...props} />
);

export const PromptInputSelectItem = ({ className, ...props }: ComponentProps<typeof SelectItem>) => (
  <SelectItem className={cn(className)} {...props} />
);

export const PromptInputSelectValue = ({ className, ...props }: ComponentProps<typeof SelectValue>) => (
  <SelectValue className={cn(className)} {...props} />
);

export const PromptInputHoverCard = ({ ...props }: ComponentProps<typeof HoverCard>) => <HoverCard {...props} />;

export const PromptInputHoverCardTrigger = (props: ComponentProps<typeof HoverCardTrigger>) => <HoverCardTrigger {...props} />;

export const PromptInputHoverCardContent = ({ align = "start", ...props }: ComponentProps<typeof HoverCardContent>) => (
  <HoverCardContent align={align} {...props} />
);

export const PromptInputTabsList = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cn(className)} {...props} />;

export const PromptInputTab = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cn(className)} {...props} />;

export const PromptInputTabLabel = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("mb-2 px-3 font-medium text-muted-foreground text-xs", className)} {...props} />
);

export const PromptInputTabBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cn("space-y-1", className)} {...props} />;

export const PromptInputTabItem = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent", className)} {...props} />
);

export const PromptInputCommand = ({ className, ...props }: ComponentProps<typeof Command>) => <Command className={cn(className)} {...props} />;

export const PromptInputCommandInput = ({ className, ...props }: ComponentProps<typeof CommandInput>) => (
  <CommandInput className={cn(className)} {...props} />
);

export const PromptInputCommandList = ({ className, ...props }: ComponentProps<typeof CommandList>) => (
  <CommandList className={cn(className)} {...props} />
);

export const PromptInputCommandEmpty = ({ className, ...props }: ComponentProps<typeof CommandEmpty>) => (
  <CommandEmpty className={cn(className)} {...props} />
);

export const PromptInputCommandGroup = ({ className, ...props }: ComponentProps<typeof CommandGroup>) => (
  <CommandGroup className={cn(className)} {...props} />
);

export const PromptInputCommandItem = ({ className, ...props }: ComponentProps<typeof CommandItem>) => (
  <CommandItem className={cn(className)} {...props} />
);

export const PromptInputCommandSeparator = ({ className, ...props }: ComponentProps<typeof CommandSeparator>) => (
  <CommandSeparator className={cn(className)} {...props} />
);
