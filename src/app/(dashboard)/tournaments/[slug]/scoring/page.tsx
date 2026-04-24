import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  tournaments,
  matches,
  sets,
  teams,
  courts,
  pools,
} from "@/lib/db/schema";
import { eq, or, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoringCard } from "./scoring-card";
import { LiveScoreViewer } from "./live-score-viewer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ScoringPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);

  if (!tournament) notFound();

  const id = tournament.id;

  const isOrganizer = tournament.organizerId === user.id;

  // Get all matches that belong to this tournament (through pools/brackets)
  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.scheduledTime));

  // Enrich with team names, court names, and sets
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

      return {
        ...match,
        teamA,
        teamB,
        courtName: court?.name ?? null,
        sets: matchSets,
      };
    })
  );

  const inProgress = enrichedMatches.filter((m) => m.status === "in_progress");
  const upcoming = enrichedMatches.filter((m) => m.status === "upcoming");
  const completed = enrichedMatches.filter((m) => m.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Scoring</h1>
        <p className="text-muted-foreground">{tournament.name}</p>
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
                  canScore={isOrganizer}
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
                  canScore={isOrganizer}
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
                  canScore={false}
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
