"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: (slug: string) => `/explore/tournaments/${slug}` },
  { label: "Pools", href: (slug: string) => `/explore/tournaments/${slug}/pools` },
  {
    label: "Bracket",
    href: (slug: string) => `/explore/tournaments/${slug}/bracket`,
  },
  {
    label: "Scores",
    href: (slug: string) => `/explore/tournaments/${slug}/scores`,
  },
] as const;

export function PublicTournamentNav({
  slug,
  hasReleasedPlay,
}: {
  slug: string;
  hasReleasedPlay: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Tournament sections"
      className="flex gap-1 overflow-x-auto border-b border-border pb-px [scrollbar-width:none]"
    >
      {TABS.map((tab) => {
        const href = tab.href(slug);
        const active =
          tab.label === "Overview"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        const disabled =
          tab.label !== "Overview" && !hasReleasedPlay;

        if (disabled) {
          return (
            <span
              key={tab.label}
              className="shrink-0 cursor-not-allowed px-3 py-2 text-sm font-medium text-muted-foreground/50"
              title="Available after the host releases pools"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
