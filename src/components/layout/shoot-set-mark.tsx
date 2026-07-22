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

import Link from "next/link";
import { cn } from "@/lib/utils";

type ShootSetMarkProps = {
  /** If set, wraps the wordmark in a link */
  href?: string;
  className?: string;
  /** Classes on the inner wordmark (Shoot + Set) */
  wordmarkClassName?: string;
  onClick?: () => void;
};

/**
 * Brand wordmark: "ShootSet" as one word — Shoot (primary/red), Set (secondary/blue).
 */
export function ShootSetMark({
  href,
  className,
  wordmarkClassName,
  onClick,
}: ShootSetMarkProps) {
  const wordmark = (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap font-extrabold tracking-tight",
        wordmarkClassName
      )}
    >
      <span className="text-primary">Shoot</span>
      <span className="text-secondary">Set</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={cn("shrink-0", className)} onClick={onClick}>
        {wordmark}
      </Link>
    );
  }

  return <span className={className}>{wordmark}</span>;
}
