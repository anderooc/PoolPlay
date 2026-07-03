import { Trophy } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { divisions, tournaments } from "@/lib/db/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  isTournamentOrganizer,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";
import { ensureDivisionBracketSkeleton } from "@/lib/tournaments/bracket-structure";
import { getDivisionPlayData } from "../brackets/data";
import { BracketView } from "../brackets/bracket-view";
import { DivisionPoolRelease } from "../brackets/division-pool-release";

export async function TournamentBracketPanel({
  tournament,
  user,
}: {
  tournament: InferSelectModel<typeof tournaments>;
  user: UserForPermissions;
}) {
  const isOrganizer = isTournamentOrganizer(tournament, user);

  const [divisionPlayData, tournamentDivisions] = await Promise.all([
    getDivisionPlayData(tournament.id, { forOrganizer: isOrganizer }),
    isOrganizer
      ? db
          .select({
            id: divisions.id,
            format: divisions.format,
            teamCap: divisions.teamCap,
          })
          .from(divisions)
          .where(eq(divisions.tournamentId, tournament.id))
      : Promise.resolve([]),
  ]);

  if (isOrganizer && tournamentDivisions.length > 0) {
    const divsWithBracket = new Set(
      divisionPlayData.filter((d) => d.brackets.length > 0).map((d) => d.id)
    );
    for (const div of tournamentDivisions) {
      if (divsWithBracket.has(div.id)) continue;
      await ensureDivisionBracketSkeleton(div.id, div.format, div.teamCap);
    }
  }

  const eligibleDivisions = divisionPlayData.filter((d) => {
    const bracketFormat =
      d.format === "pool_to_bracket" ||
      d.format === "single_elimination" ||
      d.format === "double_elimination";
    if (!bracketFormat) return false;
    if (!isOrganizer && !d.poolsReleasedAt) return false;
    return isOrganizer || d.brackets.length > 0;
  });

  return (
    <div className="space-y-6">
      {isOrganizer && (
        <p className="text-sm text-muted-foreground">
          Brackets are created when you add a pool in Setup. Release a pool on
          the Pools tab when you are ready for participants to see standings and
          brackets.
        </p>
      )}
      {eligibleDivisions.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No brackets yet"
          description={
            isOrganizer
              ? "Pick a bracket format for a division in the Setup tab."
              : "Brackets haven’t been released for this tournament yet. Check back soon."
          }
        />
      ) : (
        <Tabs defaultValue={eligibleDivisions[0].id}>
          {eligibleDivisions.length > 1 && (
            <TabsList>
              {eligibleDivisions.map((div) => (
                <TabsTrigger key={div.id} value={div.id}>
                  {div.name}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
          {eligibleDivisions.map((div) => (
            <TabsContent
              key={div.id}
              value={div.id}
              className="mt-4 space-y-4"
            >
              {isOrganizer && (
                <DivisionPoolRelease
                  tournamentId={tournament.id}
                  divisionId={div.id}
                  divisionName={div.name}
                  poolsReleasedAt={div.poolsReleasedAt}
                  matchCount={div.pools.reduce(
                    (n, p) => n + p.matches.length,
                    0
                  )}
                  completedMatchCount={div.pools.reduce(
                    (n, p) =>
                      n +
                      p.matches.filter((m) => m.status === "completed").length,
                    0
                  )}
                />
              )}
              {div.brackets.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No bracket for this division yet"
                  description="Add the pool again in Setup, or contact support if this persists."
                />
              ) : (
                <div className="space-y-4">
                  {div.brackets.map((bracket) => (
                    <BracketView
                      key={bracket.id}
                      bracket={bracket}
                      slug={tournament.slug}
                    />
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
