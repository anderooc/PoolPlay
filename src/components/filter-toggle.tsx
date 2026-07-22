"use client";

/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function filterToggleClassName(pressed: boolean): string {
  return cn(
    "h-auto min-h-9 w-full min-w-0 border px-3 py-1.5 text-xs font-medium leading-snug whitespace-normal text-center",
    pressed
      ? "border-primary bg-primary/10 text-foreground shadow-none"
      : "bg-transparent text-muted-foreground"
  );
}

export function FilterToggle({
  label,
  pressed,
  onClick,
  className,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={cn(filterToggleClassName(pressed), className)}
      onClick={onClick}
      aria-pressed={pressed}
    >
      {label}
    </Button>
  );
}
