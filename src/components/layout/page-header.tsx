import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard dashboard page header: title + optional description, an actions
 * slot that wraps below on mobile, and an optional row (badges, meta) under
 * the title. Matches the type scale established on the dashboard.
 */
interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Extra content under the description (status badges, meta line, etc.). */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-pretty text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
