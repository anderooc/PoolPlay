import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  tournaments,
  divisions,
  pools,
  poolTeams,
  brackets,
  matches,
  sets,
  teams,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PoolView } from "./pool-view";
import { BracketView } from "./bracket-view";
import { GenerateControls } from "./generate-controls";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BracketsPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);

  if (!tournament) notFound();

  const tournamentDivisions = await db
    .select()
    .from(divisions)
    .where(eq(divisions.tournamentId, id));

  const isOrganizer = tournament.organizerId === user.id;

  const divisionData = await Promise.all(
    tournamentDivisions.map(async (div) => {
      const divPools = await db
        .select()
        .from(pools)
        .where(eq(pools.divisionId, div.id));

      const poolData = await Promise.all(
        divPools.map(async (pool) => {
          const pTeams = await db
            .select({
              id: teams.id,
              name: teams.name,
              university: teams.university,
              seed: poolTeams.seed,
            })
            .from(poolTeams)
            .innerJoin(teams, eq(poolTeams.teamId, teams.id))
            .where(eq(poolTeams.poolId, pool.id));

          const poolMatches = await db
            .select()
            .from(matches)
            .where(eq(matches.poolId, pool.id));

          const matchData = await Promise.all(
            poolMatches.map(async (m) => {
              const matchSets = await db
                .select()
                .from(sets)
                .where(eq(sets.matchId, m.id));

              const teamA = m.teamAId
                ? pTeams.find((t) => t.id === m.teamAId) ?? null
                : null;
              const teamB = m.teamBId
                ? pTeams.find((t) => t.id === m.teamBId) ?? null
                : null;

              return { ...m, sets: matchSets, teamA, teamB };
            })
          );

          return { ...pool, teams: pTeams, matches: matchData };
        })
      );

      const divBrackets = await db
        .select()
        .from(brackets)
        .where(eq(brackets.divisionId, div.id));

      const bracketData = await Promise.all(
        divBrackets.map(async (bracket) => {
          const bracketMatches = await db
            .select()
            .from(matches)
            .where(eq(matches.bracketId, bracket.id));

          const allTeamIds = [
            ...new Set(
              bracketMatches
                .flatMap((m) => [m.teamAId, m.teamBId])
                .filter(Boolean) as string[]
            ),
          ];

          const bracketTeams =
            allTeamIds.length > 0
              ? await db
                  .select({ id: teams.id, name: teams.name })
                  .from(teams)
                  .where(
                    eq(
                      teams.id,
                      allTeamIds[0] // We need to get all teams, do individually
                    )
                  )
              : [];

          // Get all bracket teams
          const teamMap = new Map<string, string>();
          for (const tid of allTeamIds) {
            const [t] = await db
              .select({ id: teams.id, name: teams.name })
              .from(teams)
              .where(eq(teams.id, tid));
            if (t) teamMap.set(t.id, t.name);
          }

          const enrichedMatches = bracketMatches.map((m) => ({
            ...m,
            teamAName: m.teamAId ? teamMap.get(m.teamAId) ?? null : null,
            teamBName: m.teamBId ? teamMap.get(m.teamBId) ?? null : null,
          }));

          return { ...bracket, matches: enrichedMatches };
        })
      );

      return { ...div, pools: poolData, brackets: bracketData };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Pools &amp; Brackets
        </h1>
        <p className="text-muted-foreground">{tournament.name}</p>
      </div>

      {tournamentDivisions.length === 0 ? (
        <p className="text-muted-foreground">No divisions configured.</p>
      ) : (
        <Tabs defaultValue={tournamentDivisions[0]?.id}>
          <TabsList>
            {tournamentDivisions.map((div) => (
              <TabsTrigger key={div.id} value={div.id}>
                {div.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {divisionData.map((div) => (
            <TabsContent key={div.id} value={div.id} className="mt-4 space-y-6">
              {isOrganizer && (
                <GenerateControls
                  tournamentId={id}
                  divisionId={div.id}
                  divisionFormat={div.format}
                  hasPools={div.pools.length > 0}
                />
              )}

              {div.pools.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Pool Play</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {div.pools.map((pool) => (
                      <PoolView key={pool.id} pool={pool} />
                    ))}
                  </div>
                </div>
              )}

              {div.brackets.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Bracket</h2>
                  {div.brackets.map((bracket) => (
                    <BracketView key={bracket.id} bracket={bracket} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
