import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  matches,
  sets,
  teams,
  courts,
} from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { BackLink } from "@/components/layout/back-link";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoringCard } from "./scoring-card";
import { LiveScoreViewer } from "./live-score-viewer";
import { getTournamentBySlugIfVisible } from "@/lib/tournaments/access";
import {
  canScoreMatches,
  isTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import { getTournamentMatchIds } from "@/lib/tournaments/match-query";
import {
  getMatchDivisionIdMap,
  getUnreleasedDivisionIds,
} from "@/lib/tournaments/unreleased-divisions";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ScoringPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tournament = await getTournamentBySlugIfVisible(slug, user);
  if (!tournament) notFound();

  const id = tournament.id;
  const canScore = canScoreMatches(tournament, user);
  const isOrganizer = isTournamentOrganizer(tournament, user);

  const matchIds = await getTournamentMatchIds(id);

  let allMatches =
    matchIds.length === 0
      ? []
      : await db
          .select()
          .from(matches)
          .where(inArray(matches.id, matchIds))
          .orderBy(asc(matches.scheduledTime));

  if (!isOrganizer && allMatches.length > 0) {
    const [unreleasedDivisionIds, matchDivisionId] = await Promise.all([
      getUnreleasedDivisionIds(id),
      getMatchDivisionIdMap(id),
    ]);
    if (unreleasedDivisionIds.size > 0) {
      allMatches = allMatches.filter((match) => {
        const divisionId = matchDivisionId.get(match.id);
        if (!divisionId) return true;
        return !unreleasedDivisionIds.has(divisionId);
      });
    }
  }

  const enrichedMatches = await Promise.all(
    allMatches.map(async (match) => {
      const teamA = match.teamAId
        ? (
            await db
              .select({ id: teams.id, name: teams.name })
              .from(teams)
              .where(eq(teams.id, match.teamAId))
              .limit(1)
          )[0]
        : null;

      const teamB = match.teamBId
        ? (
            await db
              .select({ id: teams.id, name: teams.name })
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

      const matchSets = await db
        .select()
        .from(sets)
        .where(eq(sets.matchId, match.id))
        .orderBy(asc(sets.setNumber));

      const refTeam = match.refTeamId
        ? (
            await db
              .select({ name: teams.name })
              .from(teams)
              .where(eq(teams.id, match.refTeamId))
              .limit(1)
          )[0]
        : null;

      return {
        ...match,
        teamA,
        teamB,
        courtName: court?.name ?? null,
        refTeamName: refTeam?.name ?? null,
        sets: matchSets,
      };
    })
  );

  const inProgress = enrichedMatches.filter((m) => m.status === "in_progress");
  const upcoming = enrichedMatches.filter((m) => m.status === "upcoming");
  const completed = enrichedMatches.filter((m) => m.status === "completed");

  return (
    <div className="space-y-6">
      <BackLink href={`/tournaments/${slug}`}>Back to tournament</BackLink>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Scoring</h1>
        <p className="text-muted-foreground">{tournament.name}</p>
        {isOrganizer && !canScore && (
          <p className="mt-2 text-sm text-muted-foreground">
            Set the tournament status to In progress to enter scores.
          </p>
        )}
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">
            Live ({inProgress.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          {inProgress.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No matches in progress.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inProgress.map((match) => (
                <ScoringCard
                  key={match.id}
                  match={match}
                  canScore={canScore}
                  matchFormat={tournament.matchFormat}
                  setStartingScore={tournament.setStartingScore}
                  setTargetScore={tournament.setTargetScore}
                  tiebreakTargetScore={tournament.tiebreakTargetScore}
                  warmupFormat={tournament.warmupFormat}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No upcoming matches.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcoming.map((match) => (
                <ScoringCard
                  key={match.id}
                  match={match}
                  canScore={canScore}
                  matchFormat={tournament.matchFormat}
                  setStartingScore={tournament.setStartingScore}
                  setTargetScore={tournament.setTargetScore}
                  tiebreakTargetScore={tournament.tiebreakTargetScore}
                  warmupFormat={tournament.warmupFormat}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completed.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No completed matches yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completed.map((match) => (
                <ScoringCard
                  key={match.id}
                  match={match}
                  canScore={canScore}
                  matchFormat={tournament.matchFormat}
                  setStartingScore={tournament.setStartingScore}
                  setTargetScore={tournament.setTargetScore}
                  tiebreakTargetScore={tournament.tiebreakTargetScore}
                  warmupFormat={tournament.warmupFormat}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LiveScoreViewer tournamentId={id} />
    </div>
  );
}
