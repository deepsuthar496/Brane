interface SectionDividerProps {
  label: string;
}

export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-semibold tracking-wide uppercase text-txt-3 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
