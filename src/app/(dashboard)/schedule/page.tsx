import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, teams, courts, tournaments, pools, brackets, divisions } from "@/lib/db/schema";
import { eq, isNotNull, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ScheduleControls } from "./schedule-controls";

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
      if (match.poolId) {
        const [pool] = await db
          .select({ name: pools.name })
          .from(pools)
          .where(eq(pools.id, match.poolId))
          .limit(1);
        contextLabel = pool?.name ?? "Pool";
      } else if (match.bracketRound) {
        contextLabel = `Bracket R${match.bracketRound}`;
      }

      return {
        ...match,
        teamAName: teamA?.name ?? "TBD",
        teamBName: teamB?.name ?? "TBD",
        courtName: court?.name ?? "Unassigned",
        contextLabel,
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">
          View all scheduled matches across tournaments.
        </p>
      </div>

      {userTournaments.length > 0 && (
        <ScheduleControls tournaments={userTournaments} />
      )}

      {enrichedMatches.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              No scheduled matches yet. Generate pools or brackets first, then
              use auto-schedule.
            </p>
          </CardContent>
        </Card>
      ) : (
        [...byDate.entries()].map(([dateKey, dayMatches]) => (
          <div key={dateKey} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {dateKey === "unscheduled"
                ? "Unscheduled"
                : format(new Date(dateKey + "T00:00:00"), "EEEE, MMMM d, yyyy")}
            </h2>
            <div className="grid gap-2">
              {dayMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-4">
                    {match.scheduledTime && (
                      <span className="text-sm font-medium text-muted-foreground w-16">
                        {format(match.scheduledTime, "h:mm a")}
                      </span>
                    )}
                    <div>
                      <p className="font-medium">
                        {match.teamAName} vs {match.teamBName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.courtName}
                        {match.contextLabel && ` \u00B7 ${match.contextLabel}`}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      match.status === "in_progress"
                        ? "default"
                        : match.status === "completed"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {match.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
