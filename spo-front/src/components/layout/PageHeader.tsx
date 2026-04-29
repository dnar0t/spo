import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-gradient-header">
      <div className="px-6 py-3">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1.5">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border">/</span>}
                <span className={i === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        )}

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-foreground leading-tight min-w-0 truncate">
            {title}
          </h1>
          {actions && (
            <div className="flex items-center gap-2 shrink-0 ml-auto flex-nowrap">
              {actions}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
        )}
      </div>
    </div>
  );
}
