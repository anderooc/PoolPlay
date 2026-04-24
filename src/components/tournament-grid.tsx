"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin, Search, ChevronDown, Trophy } from "lucide-react";

interface Tournament {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  registration_open: "Registration Open",
  registration_closed: "Registration Closed",
  in_progress: "In Progress",
  completed: "Completed",
};

function statusVariant(status: string) {
  if (status === "in_progress") return "default" as const;
  if (status === "registration_open") return "default" as const;
  return "secondary" as const;
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

function groupByDate(list: Tournament[]): { date: string; tournaments: Tournament[] }[] {
  const map = new Map<string, Tournament[]>();
  for (const t of list) {
    const existing = map.get(t.startDate);
    if (existing) {
      existing.push(t);
    } else {
      map.set(t.startDate, [t]);
    }
  }
  return Array.from(map.entries()).map(([date, tournaments]) => ({
    date,
    tournaments,
  }));
}

function categorizeTournaments(list: Tournament[]) {
  const today = new Date().toISOString().slice(0, 10);

  const happeningNow: Tournament[] = [];
  const upcoming: Tournament[] = [];
  const archive: Tournament[] = [];

  for (const t of list) {
    if (
      t.status === "in_progress" ||
      (t.startDate <= today && t.endDate >= today && t.status !== "completed")
    ) {
      happeningNow.push(t);
    } else if (t.endDate >= today && t.status !== "completed") {
      upcoming.push(t);
    } else {
      archive.push(t);
    }
  }

  happeningNow.sort((a, b) => a.startDate.localeCompare(b.startDate));
  upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
  archive.sort((a, b) => b.startDate.localeCompare(a.startDate));

  return { happeningNow, upcoming, archive };
}

function TournamentRow({
  tournament: t,
  linkPrefix,
}: {
  tournament: Tournament;
  linkPrefix: string;
}) {
  return (
    <Link href={`${linkPrefix}/${t.slug}`} className="block">
      <div className="flex items-start gap-4 rounded-lg border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium leading-tight">{t.name}</span>
            <Badge
              variant={statusVariant(t.status)}
              className="shrink-0 text-xs"
            >
              {STATUS_LABEL[t.status] ?? t.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {t.location}
            </span>
            {t.startDate !== t.endDate && (
              <span className="tabular-nums">
                {t.startDate}&nbsp;–&nbsp;{t.endDate}
              </span>
            )}
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

function DateGroupedList({
  tournaments,
  linkPrefix,
}: {
  tournaments: Tournament[];
  linkPrefix: string;
}) {
  const groups = groupByDate(tournaments);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.date}>
          <h3 className="mb-2 text-sm font-medium text-foreground/70">
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
      ))}
    </div>
  );
}

function Section({
  title,
  tournaments,
  linkPrefix,
  emptyMessage,
  collapsible = false,
}: {
  title: string;
  tournaments: Tournament[];
  linkPrefix: string;
  emptyMessage?: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(!collapsible);

  if (tournaments.length === 0 && !emptyMessage) return null;

  return (
    <section className="space-y-3">
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-md py-1 text-left transition-colors ${
          collapsible ? "cursor-pointer hover:bg-muted/40 px-2 -mx-2" : ""
        }`}
        onClick={() => collapsible && setExpanded((v) => !v)}
        disabled={!collapsible}
      >
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <Badge variant="secondary" className="text-xs">
          {tournaments.length}
        </Badge>
        {collapsible && (
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground ml-auto transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {expanded &&
        (tournaments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
        ) : (
          <DateGroupedList tournaments={tournaments} linkPrefix={linkPrefix} />
        ))}
    </section>
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

  const { happeningNow, upcoming, archive } = useMemo(
    () => categorizeTournaments(filtered),
    [filtered]
  );

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
        <>
          <Section
            title="Happening Now"
            tournaments={happeningNow}
            linkPrefix={linkPrefix}
          />
          <Section
            title="Upcoming"
            tournaments={upcoming}
            linkPrefix={linkPrefix}
            emptyMessage="No upcoming tournaments."
          />
          {archive.length > 0 && (
            <Section
              title="Archive"
              tournaments={archive}
              linkPrefix={linkPrefix}
              collapsible
            />
          )}
        </>
      )}
    </div>
  );
}
