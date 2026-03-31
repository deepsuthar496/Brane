import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderProps {
  breadcrumbs: string[];
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function PageHeader({ breadcrumbs, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="px-7 pt-6 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4 text-xs text-txt-3" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-2.5" />}
            {i === breadcrumbs.length - 1 ? (
              <span className="text-muted-foreground font-medium">{crumb}</span>
            ) : (
              <span>{crumb}</span>
            )}
          </span>
        ))}
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[21px] font-bold text-foreground tracking-tight leading-tight text-balance">
            {title}
          </h1>
          <p className="text-[13px] text-txt-3 mt-1 font-normal">{subtitle}</p>
        </div>
        {actions && (
          <div className="flex gap-2 items-center shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
