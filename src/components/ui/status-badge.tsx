import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "inactive" | "error";
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-[5px] px-2 py-[3px] rounded-full text-[11px] font-medium shrink-0",
        status === "active" && "bg-agent-green-dim text-agent-green",
        status === "inactive" && "bg-muted text-txt-3",
        status === "error" && "bg-agent-red-dim text-agent-red",
        className
      )}
    >
      <span
        className={cn(
          "size-[5px] rounded-full",
          status === "active" && "bg-agent-green",
          status === "inactive" && "bg-txt-3",
          status === "error" && "bg-agent-red"
        )}
      />
      {label}
    </div>
  );
}
