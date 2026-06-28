import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, teams, courts, tournaments, pools, brackets, divisions } from "@/lib/db/schema";
import { eq, isNotNull, asc } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarClock } from "lucide-react";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ScheduleControls } from "./schedule-controls";
import { warmupMinutesForFormat, type WarmupFormat } from "@/lib/labels/warmup-format";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scheduledMatches = await db
    .select()
    .from(matches)
    .where(isNotNull(matches.scheduledTime))
    .orderBy(asc(matches.scheduledTime));

  const enrichedMatches = await Promise.all(
    scheduledMatches.map(async (match) => {
      const teamA = match.teamAId
        ? (
            await db
              .select({ name: teams.name })
              .from(teams)
              .where(eq(teams.id, match.teamAId))
              .limit(1)
          )[0]
        : null;

      const teamB = match.teamBId
        ? (
            await db
              .select({ name: teams.name })
              .from(teams)
              .where(eq(teams.id, match.teamBId))
              .limit(1)
          )[0]
        : null;

      const court = match.courtId
        ? (
            await db
              .select({ name: courts.name })
              .from(courts)
              .where(eq(courts.id, match.courtId))
              .limit(1)
          )[0]
        : null;

      let contextLabel = "";
      let warmupFormat: WarmupFormat = "none";
      if (match.poolId) {
        const [pool] = await db
          .select({
            name: pools.name,
            warmupFormat: tournaments.warmupFormat,
          })
          .from(pools)
          .innerJoin(divisions, eq(pools.divisionId, divisions.id))
          .innerJoin(tournaments, eq(divisions.tournamentId, tournaments.id))
          .where(eq(pools.id, match.poolId))
          .limit(1);
        contextLabel = pool?.name ?? "Pool";
        warmupFormat = pool?.warmupFormat ?? "none";
      } else if (match.bracketId) {
        const [info] = await db
          .select({ warmupFormat: tournaments.warmupFormat })
          .from(brackets)
          .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
          .innerJoin(tournaments, eq(divisions.tournamentId, tournaments.id))
          .where(eq(brackets.id, match.bracketId))
          .limit(1);
        warmupFormat = info?.warmupFormat ?? "none";
        if (match.bracketRound) {
          contextLabel = `Bracket R${match.bracketRound}`;
        }
      }

      const refTeam = match.refTeamId
        ? (
            await db
              .select({ name: teams.name })
              .from(teams)
              .where(eq(teams.id, match.refTeamId))
              .limit(1)
          )[0]
        : null;

      const warmupMinutes = warmupMinutesForFormat(warmupFormat);
      const warmupStart =
        match.scheduledTime && warmupMinutes > 0
          ? new Date(match.scheduledTime.getTime() - warmupMinutes * 60 * 1000)
          : null;

      return {
        ...match,
        teamAName: teamA?.name ?? "TBD",
        teamBName: teamB?.name ?? "TBD",
        courtName: court?.name ?? "Unassigned",
        refTeamName: refTeam?.name ?? null,
        contextLabel,
        warmupStart,
      };
    })
  );

  // Group by date
  const byDate = new Map<string, typeof enrichedMatches>();
  for (const match of enrichedMatches) {
    const dateKey = match.scheduledTime
      ? format(match.scheduledTime, "yyyy-MM-dd")
      : "unscheduled";
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(match);
  }

  // Get tournaments the user organizes
  const userTournaments = await db
    .select({ id: tournaments.id, name: tournaments.name })
    .from(tournaments)
    .where(eq(tournaments.organizerId, user.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description="View all scheduled matches across tournaments."
      />

      {userTournaments.length > 0 && (
        <ScheduleControls tournaments={userTournaments} />
      )}

      {enrichedMatches.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No scheduled matches yet"
          description="Create a tournament and generate pools or brackets, then auto-schedule to see matches here."
        />
      ) : (
        [...byDate.entries()].map(([dateKey, dayMatches]) => (
          <div key={dateKey} className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {dateKey === "unscheduled"
                ? "Unscheduled"
                : format(new Date(dateKey + "T00:00:00"), "EEE, MMM d, yyyy")}
            </h2>
            <div className="grid gap-2">
              {dayMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    {match.scheduledTime && (
                      <div className="flex min-w-[4.5rem] flex-col items-end text-sm font-medium tabular-nums text-muted-foreground">
                        <span>{format(match.scheduledTime, "h:mm a")}</span>
                        {match.warmupStart && (
                          <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground/70">
                            Warmup {format(match.warmupStart, "h:mm")}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {match.teamAName} vs {match.teamBName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {match.courtName}
                        {match.contextLabel && `\u00A0\u00B7\u00A0${match.contextLabel}`}
                        {match.refTeamName && `\u00A0\u00B7\u00A0Ref ${match.refTeamName}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    kind="match"
                    status={match.status}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
