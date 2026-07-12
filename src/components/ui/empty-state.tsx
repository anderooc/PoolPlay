/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "card" | "inline";
  /** Brand accent for the icon well. Defaults to primary. */
  accent?: "primary" | "secondary";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "card",
  accent = "primary",
}: EmptyStateProps) {
  const accentClasses =
    accent === "primary"
      ? "from-primary/15 to-primary/5 text-primary"
      : "from-secondary/15 to-secondary/5 text-secondary";

  const inner = (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden text-center",
        variant === "card" ? "px-6 py-12" : "py-8",
        className
      )}
    >
      {variant === "card" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 text-foreground/[0.05] bg-dot-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]"
        />
      )}
      {Icon && (
        <span
          className={cn(
            "mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ring-1 ring-inset ring-border/60",
            accentClasses
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <p className="font-heading text-base font-semibold tracking-tight text-foreground">
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-sm text-pretty text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );

  if (variant === "inline") return inner;

  return (
    <Card>
      <CardContent className="p-0">{inner}</CardContent>
    </Card>
  );
}
