import Link from "next/link";
import { format as formatDate } from "date-fns";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { DivisionPlayData } from "./brackets/data";

interface BoardMatch {
  id: string;
  status: string;
  scheduledTime: Date | null;
  label: string;
  context: string;
  teamAName: string | null;
  teamBName: string | null;
  winnerId: string | null;
  teamAId: string | null;
  teamBId: string | null;
}

function flattenMatches(divisions: DivisionPlayData[]): BoardMatch[] {
  const out: BoardMatch[] = [];
  for (const div of divisions) {
    for (const pool of div.pools) {
      for (const m of pool.matches) {
        out.push({
          id: m.id,
          status: m.status,
          scheduledTime: m.scheduledTime,
          label: `${m.teamA?.name ?? "TBD"} vs ${m.teamB?.name ?? "TBD"}`,
          context: `${div.name} · ${pool.name}`,
          teamAName: m.teamA?.name ?? null,
          teamBName: m.teamB?.name ?? null,
          winnerId: m.winnerId,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
        });
      }
    }
    for (const bracket of div.brackets) {
      for (const m of bracket.matches) {
        if (!m.teamAName && !m.teamBName) continue;
        out.push({
          id: m.id,
          status: m.status,
          scheduledTime: m.scheduledTime,
          label: `${m.teamAName ?? "TBD"} vs ${m.teamBName ?? "TBD"}`,
          context: `${div.name} · Bracket`,
          teamAName: m.teamAName,
          teamBName: m.teamBName,
          winnerId: m.winnerId,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
        });
      }
    }
  }
  return out;
}

function sortByTime(a: BoardMatch, b: BoardMatch): number {
  const at = a.scheduledTime ? a.scheduledTime.getTime() : Infinity;
  const bt = b.scheduledTime ? b.scheduledTime.getTime() : Infinity;
  return at - bt;
}

function MatchRow({ slug, match }: { slug: string; match: BoardMatch }) {
  return (
    <Link
      href={`/tournaments/${slug}/matches/${match.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-muted/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{match.label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{match.context}</span>
          {match.scheduledTime && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {formatDate(match.scheduledTime, "EEE h:mm a")}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge kind="match" status={match.status} />
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

/**
 * Read-friendly schedule of every match in a tournament, grouped by lifecycle.
 * Doubles as the spectator board and the host's quick jump-to-match list.
 */
export function MatchBoard({
  slug,
  divisions,
}: {
  slug: string;
  divisions: DivisionPlayData[];
}) {
  const all = flattenMatches(divisions);
  if (all.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No matches yet"
        description="Once pools or brackets are generated, every match shows up here with live status and scores."
      />
    );
  }

  const live = all.filter((m) => m.status === "in_progress").sort(sortByTime);
  const upcoming = all.filter((m) => m.status === "upcoming").sort(sortByTime);
  const completed = all
    .filter((m) => m.status === "completed")
    .sort(sortByTime);

  return (
    <div className="space-y-6">
      {live.length > 0 && (
        <Section title="Live" count={live.length}>
          {live.map((m) => (
            <MatchRow key={m.id} slug={slug} match={m} />
          ))}
        </Section>
      )}
      <Section title="Upcoming" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No upcoming matches.
            </CardContent>
          </Card>
        ) : (
          upcoming.map((m) => <MatchRow key={m.id} slug={slug} match={m} />)
        )}
      </Section>
      {completed.length > 0 && (
        <Section title="Completed" count={completed.length}>
          {completed.map((m) => (
            <MatchRow key={m.id} slug={slug} match={m} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">
        {title}{" "}
        <span className="font-normal text-muted-foreground">({count})</span>
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
