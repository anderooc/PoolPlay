"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import { useCallback, useEffect, useState } from "react";
import type {
  PublicMatchStatus,
  TournamentMatchContract,
} from "@/lib/api/contracts/tournament";
import { PublicMatchRow } from "./public-match-row";
import { cn } from "@/lib/utils";

type BoardTab = PublicMatchStatus;

const TABS: { id: BoardTab; label: string }[] = [
  { id: "in_progress", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Final" },
];

export function PublicScoresBoard({
  slug,
  initialMatches,
}: {
  slug: string;
  initialMatches: TournamentMatchContract[];
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [tab, setTab] = useState<BoardTab>("in_progress");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/tournaments/${slug}/matches`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: { matches: TournamentMatchContract[] };
      };
      if (payload.data?.matches) {
        setMatches(payload.data.matches);
      }
    } catch {
      // Polling is best-effort.
    }
  }, [slug]);

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const grouped: Record<BoardTab, TournamentMatchContract[]> = {
    in_progress: matches.filter((match) => match.status === "in_progress"),
    upcoming: matches.filter((match) => match.status === "upcoming"),
    completed: matches.filter((match) => match.status === "completed"),
  };

  const visible = grouped[tab];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Scoreboard"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          const count = grouped[item.id].length;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {TABS.find((t) => t.id === tab)?.label.toLowerCase()} matches right
          now.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((match) => (
            <PublicMatchRow
              key={match.slug}
              match={match}
              tournamentSlug={slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
