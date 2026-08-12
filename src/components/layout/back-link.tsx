"use client";

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

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BackLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** When true, Next will eagerly prefetch the target. Defaults to true. */
  prefetch?: boolean;
}

function BackLinkStatus() {
  const { pending } = useLinkStatus();
  return (
    <>
      <ArrowLeft
        aria-hidden
        className={cn(
          "h-3.5 w-3.5 transition-opacity duration-150",
          pending && "opacity-0"
        )}
      />
      {pending && (
        <Loader2
          aria-hidden
          className="absolute h-3.5 w-3.5 animate-spin text-muted-foreground"
        />
      )}
    </>
  );
}

/**
 * Small "Back to …" link used above page content. Styled to match the
 * existing tournament back link (muted, hover-darkens). Shows a tiny
 * spinner while the navigation is pending so slow routes don't feel
 * frozen.
 */
export function BackLink({
  href,
  children,
  className,
  prefetch = true,
}: BackLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        "group/backlink inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
        <BackLinkStatus />
      </span>
      {children}
    </Link>
  );
}
