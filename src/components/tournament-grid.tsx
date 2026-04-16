"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, ChevronDown } from "lucide-react";

interface Tournament {
  id: string;
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
    <Link href={`${linkPrefix}/${t.id}`} className="block">
      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{t.name}</span>
            <Badge variant={statusVariant(t.status)} className="shrink-0 text-xs">
              {STATUS_LABEL[t.status] ?? t.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {t.location}
            </span>
            {t.startDate !== t.endDate && (
              <span>
                {t.startDate} – {t.endDate}
              </span>
            )}
          </div>
          {t.description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
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
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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
        className="flex items-center gap-2 w-full text-left"
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tournaments by name, location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {query.trim()
                ? `No tournaments match "${query}".`
                : "No tournaments yet."}
            </p>
          </CardContent>
        </Card>
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
