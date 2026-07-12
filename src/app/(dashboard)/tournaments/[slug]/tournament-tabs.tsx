"use client";

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

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  tournamentTabUrl,
  type TournamentTabGroup,
  type TournamentTabId,
} from "./constants";

export type { TournamentTabItem } from "./constants";

function TournamentTabLink({
  slug,
  tab,
  active,
}: {
  slug: string;
  tab: TournamentTabGroup["tabs"][number];
  active: boolean;
}) {
  const label =
    tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;

  return (
    <Link
      href={tournamentTabUrl(slug, tab.id)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap transition-all",
        active
          ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
          : "text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
      )}
    >
      {label}
      {tab.badge !== undefined && tab.badge > 0 && (
        <Badge
          variant="default"
          className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs tabular-nums"
        >
          {tab.badge}
        </Badge>
      )}
    </Link>
  );
}

export function TournamentTabs({
  slug,
  activeTab,
  groups,
}: {
  slug: string;
  activeTab: TournamentTabId;
  groups: TournamentTabGroup[];
}) {
  if (groups.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-4 pb-5 lg:flex-row lg:items-end lg:gap-5"
      aria-label="Tournament sections"
    >
      {groups.map((group, index) => (
        <div
          key={group.id}
          className={cn(
            "min-w-0 space-y-2",
            index > 0 && "lg:border-l lg:border-border/70 lg:pl-5"
          )}
        >
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {group.label}
          </p>
          <nav
            className="inline-flex h-auto max-w-full flex-wrap justify-start gap-1 rounded-lg bg-muted/80 p-1 text-muted-foreground ring-1 ring-border/50"
            aria-label={group.label}
          >
            {group.tabs.map((tab) => (
              <TournamentTabLink
                key={tab.id}
                slug={slug}
                tab={tab}
                active={tab.id === activeTab}
              />
            ))}
          </nav>
        </div>
      ))}
    </div>
  );
}
