/*
 * brackt - Collegiate club volleyball tournament hub
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

import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  /** Pixel size (width/height) */
  size?: number;
  /** On primary buttons, use light ring */
  variant?: "default" | "onPrimary";
};

/** Ring spinner — reliable visibility across themes */
export function Spinner({
  className,
  size = 40,
  variant = "default",
}: SpinnerProps) {
  const s = `${size}px`;
  return (
    <span
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-t-transparent",
        variant === "onPrimary"
          ? "border-primary-foreground"
          : "border-primary",
        className
      )}
      style={{ width: s, height: s }}
      aria-hidden
    />
  );
}
