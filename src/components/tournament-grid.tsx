"use client";

import { useState, useMemo, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin, Search, Trophy } from "lucide-react";
import {
  isTournamentArchived,
  statusBadgeLabel,
  todayISO,
} from "@/lib/tournament-status";

interface Tournament {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  location: string;
  date: string;
  status: string;
}

function statusVariant(
  status: string,
  archived: boolean
): "default" | "secondary" | "outline" {
  if (archived) return "outline";
  if (status === "in_progress") return "default";
  if (status === "registration_open") return "default";
  return "secondary";
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface DateGroup {
  date: string;
  tournaments: Tournament[];
}

function groupByDate(list: Tournament[]): DateGroup[] {
  const map = new Map<string, Tournament[]>();
  for (const t of list) {
    const existing = map.get(t.date);
    if (existing) {
      existing.push(t);
    } else {
      map.set(t.date, [t]);
    }
  }
  return Array.from(map.entries()).map(([date, tournaments]) => ({
    date,
    tournaments,
  }));
}

function TournamentRow({
  tournament: t,
  linkPrefix,
}: {
  tournament: Tournament;
  linkPrefix: string;
}) {
  const archived = isTournamentArchived(t.date);
  return (
    <Link href={`${linkPrefix}/${t.slug}`} className="block">
      <div className="flex items-start gap-4 rounded-lg border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium leading-tight">{t.name}</span>
            <Badge
              variant={statusVariant(t.status, archived)}
              className={
                archived
                  ? "shrink-0 border-dashed border-muted-foreground/40 bg-muted/40 text-xs text-muted-foreground"
                  : "shrink-0 text-xs"
              }
            >
              {statusBadgeLabel(t.status, t.date)}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {t.location}
            </span>
          </div>
          {t.description && (
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground/90">
              {t.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function anchorTag(date: string, today: string): string | null {
  if (date === today) return "Today";
  if (date > today) return "Up next";
  return null;
}

/**
 * One continuous chronological schedule. DOM order is oldest → newest, so
 * archived tournaments live above the soonest current/upcoming one and
 * become visible when the user scrolls up. On mount we scroll the dashboard
 * `<main>` so the anchor (today, or the next future date) sits at the top
 * of the viewport.
 */
function ChronologicalSchedule({
  tournaments,
  linkPrefix,
}: {
  tournaments: Tournament[];
  linkPrefix: string;
}) {
  const today = todayISO();

  const groups = useMemo(() => {
    const sorted = [...tournaments].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    return groupByDate(sorted);
  }, [tournaments]);

  // Anchor = first group whose date is today or in the future. If
  // everything is in the past, anchor to the most recent past group so the
  // user lands on something meaningful instead of the top of the archive.
  const anchorIdx = useMemo(() => {
    const idx = groups.findIndex((g) => g.date >= today);
    if (idx !== -1) return idx;
    return Math.max(groups.length - 1, 0);
  }, [groups, today]);

  const anchorRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "auto" });
    // Mount-only on purpose: re-scrolling while the user is filtering or
    // browsing past events would yank the page out from under them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((group, i) => {
        const isAnchor = i === anchorIdx;
        const tag = isAnchor ? anchorTag(group.date, today) : null;
        return (
          <div
            key={group.date}
            ref={isAnchor ? anchorRef : undefined}
            className="scroll-mt-4"
          >
            <h3
              className={`mb-2 flex items-center gap-2 text-sm ${
                isAnchor
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/70"
              }`}
            >
              {tag && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {tag}
                </span>
              )}
              {formatDate(group.date)}
            </h3>
            <div className="space-y-2">
              {group.tournaments.map((t) => (
                <TournamentRow
                  key={t.id}
                  tournament={t}
                  linkPrefix={linkPrefix}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TournamentGrid({
  tournaments,
  linkPrefix = "/tournaments",
}: {
  tournaments: Tournament[];
  linkPrefix?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return tournaments;
    const q = query.toLowerCase();
    return tournaments.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [tournaments, query]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tournaments..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={query.trim() ? "No matches" : "No tournaments yet"}
          description={
            query.trim()
              ? `Nothing matches "${query}". Try a different search.`
              : "Check back soon for upcoming events."
          }
        />
      ) : (
        <ChronologicalSchedule
          tournaments={filtered}
          linkPrefix={linkPrefix}
        />
      )}
    </div>
  );
}
