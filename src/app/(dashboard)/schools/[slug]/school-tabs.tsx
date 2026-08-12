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
import { useSearchParams } from "next/navigation";
import { Group, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseSchoolTab,
  schoolTabUrl,
  type SchoolTabId,
} from "./school-tab";

const TABS: {
  id: SchoolTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "roster", label: "Roster", icon: Users },
  { id: "teams", label: "Teams", icon: Group },
];

export function SchoolTabs({
  slug,
  rosterCount,
  teamCount,
}: {
  slug: string;
  rosterCount: number;
  teamCount: number;
}) {
  const searchParams = useSearchParams();
  const activeTab = parseSchoolTab(searchParams.get("tab"));
  const counts: Record<SchoolTabId, number> = {
    roster: rosterCount,
    teams: teamCount,
  };

  return (
    <nav
      className="flex gap-1 border-b border-border/70 text-sm"
      aria-label="School sections"
    >
      {TABS.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <Link
            key={item.id}
            href={schoolTabUrl(slug, item.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 px-2.5 py-2 font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "border-b-2 border-foreground text-foreground"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span>{item.label}</span>
            <span
              className={cn(
                "tabular-nums text-xs",
                active ? "text-muted-foreground" : "text-muted-foreground/80"
              )}
            >
              {counts[item.id]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
