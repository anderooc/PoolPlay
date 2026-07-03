"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  tournamentTabUrl,
  type TournamentTabId,
} from "./constants";

export type TournamentTabItem = {
  id: TournamentTabId;
  label: string;
  count?: number;
  /** When set, show a badge even if count is 0 is false — only when count > 0. */
  badge?: number;
};

export function TournamentTabs({
  slug,
  activeTab,
  tabs,
}: {
  slug: string;
  activeTab: TournamentTabId;
  tabs: TournamentTabItem[];
}) {
  return (
    <div className="pb-5">
      <nav
        className="inline-flex h-auto max-w-full flex-wrap justify-start gap-[3px] rounded-lg bg-muted p-[3px] text-muted-foreground"
        aria-label="Tournament sections"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          const label =
            tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;
          return (
            <Link
              key={tab.id}
              href={tournamentTabUrl(slug, tab.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-all",
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
        })}
      </nav>
    </div>
  );
}
