import { Trophy } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { divisions, tournaments } from "@/lib/db/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  isTournamentOrganizer,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";
import {
  ensureDivisionBracketSkeleton,
  ensureTournamentCombinedBrackets,
  tournamentCombinedBracketsRegenerateState,
  tryFillBracketFromDivisionSeeds,
  tryFillTournamentCombinedBrackets,
} from "@/lib/tournaments/bracket-structure";
import { getDivisionPlayData } from "../brackets/data";
import { BracketView } from "../brackets/bracket-view";
import { BracketSeedingTable } from "../brackets/bracket-seeding-table";
import { BracketSettingsPanel } from "../brackets/bracket-settings-panel";
import { buildBracketSeedingReport } from "@/lib/tournaments/combined-bracket-standings";

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
    db
      .select({
        id: divisions.id,
        name: divisions.name,
        format: divisions.format,
        poolsReleasedAt: divisions.poolsReleasedAt,
      })
      .from(divisions)
      .where(eq(divisions.tournamentId, tournament.id))
      .orderBy(asc(divisions.createdAt), asc(divisions.id)),
  ]);

  const poolDivisions = tournamentDivisions.filter(
    (d) => d.format === "pool_to_bracket"
  );
  const otherDivisions = tournamentDivisions.filter(
    (d) =>
      d.format === "single_elimination" || d.format === "double_elimination"
  );

  if (poolDivisions.length > 0) {
    await ensureTournamentCombinedBrackets(tournament.id);
    await tryFillTournamentCombinedBrackets(tournament.id);
  }
  if (isOrganizer) {
    for (const div of otherDivisions) {
      await ensureDivisionBracketSkeleton(div.id, div.format);
      if (div.format === "single_elimination") {
        await tryFillBracketFromDivisionSeeds(div.id);
      }
    }
  }

  // Refresh play data after ensuring / seeding brackets.
  const playData =
    poolDivisions.length > 0
      ? await getDivisionPlayData(tournament.id, { forOrganizer: isOrganizer })
      : divisionPlayData;

  const ownerId = poolDivisions[0]?.id;
  const combinedBrackets =
    ownerId != null
      ? (playData.find((d) => d.id === ownerId)?.brackets ?? [])
      : [];

  const combinedLocked = combinedBrackets.some((b) =>
    b.matches.some((m) => m.teamAId || m.teamBId)
  );

  const regenerateState =
    poolDivisions.length > 0
      ? await tournamentCombinedBracketsRegenerateState(tournament.id)
      : { canRegenerate: false, reason: undefined };

  const poolDivisionIds = new Set(poolDivisions.map((d) => d.id));
  const totalBracketTeams = [
    ...new Set(
      playData
        .filter((d) => poolDivisionIds.has(d.id))
        .flatMap((d) => d.pools.flatMap((p) => p.teams.map((t) => t.id)))
    ),
  ].length;

  const showCombined =
    poolDivisions.length > 0 &&
    (isOrganizer ||
      poolDivisions.some((d) => d.poolsReleasedAt != null));

  const otherEligible = playData.filter((d) => {
    const format = tournamentDivisions.find((x) => x.id === d.id)?.format;
    if (
      format !== "single_elimination" &&
      format !== "double_elimination"
    ) {
      return false;
    }
    if (!isOrganizer && !d.poolsReleasedAt) return false;
    return isOrganizer || d.brackets.length > 0;
  });

  const hasAnything =
    (showCombined && (isOrganizer || combinedBrackets.length > 0)) ||
    otherEligible.length > 0;

  const seedingReport =
    showCombined && poolDivisions.length > 0
      ? buildBracketSeedingReport({
          pools: playData
            .filter((d) => poolDivisionIds.has(d.id))
            .flatMap((d) =>
              d.pools.map((p) => ({
                poolName: p.name,
                divisionName: d.name,
                teams: p.teams,
                matches: p.matches,
              }))
            ),
          tiebreakCriteria: tournament.poolTiebreakCriteria,
          bracketCount: tournament.bracketCount ?? 1,
          goldTeamCount: tournament.goldTeamCount,
          silverTeamCount: tournament.silverTeamCount,
        })
      : null;

  const showBracketTiers = (tournament.bracketCount ?? 1) > 1;

  return (
    <div className="space-y-6">
      {isOrganizer && poolDivisions.length > 0 && (
        <BracketSettingsPanel
          tournamentId={tournament.id}
          bracketCount={tournament.bracketCount ?? 1}
          goldTeamCount={tournament.goldTeamCount ?? null}
          silverTeamCount={tournament.silverTeamCount ?? null}
          locked={combinedLocked}
          canRegenerate={regenerateState.canRegenerate}
          regenerateBlockedReason={regenerateState.reason}
          totalBracketTeams={totalBracketTeams}
        />
      )}

      {!hasAnything ? (
        <EmptyState
          icon={Trophy}
          title="No brackets yet"
          description={
            isOrganizer
              ? "Add a pool-to-bracket division in Setup. All pools combine into gold / silver / bronze after pool play."
              : "Brackets haven’t been released for this tournament yet. Check back soon."
          }
        />
      ) : (
        <>
          {showCombined && (
            <div className="space-y-4">
              {seedingReport && seedingReport.rows.length > 0 && (
                <BracketSeedingTable
                  report={seedingReport}
                  showTiers={showBracketTiers}
                />
              )}
              {combinedBrackets.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No brackets yet"
                  description="Finish pool play in every pool to seed gold / silver / bronze."
                />
              ) : (
                <div className="space-y-4">
                  {combinedBrackets.map((bracket) => (
                    <BracketView
                      key={bracket.id}
                      bracket={bracket}
                      slug={tournament.slug}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {otherEligible.length > 0 && (
            <Tabs defaultValue={otherEligible[0].id}>
              {otherEligible.length > 1 && (
                <TabsList>
                  {otherEligible.map((div) => (
                    <TabsTrigger key={div.id} value={div.id}>
                      {div.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}
              {otherEligible.map((div) => (
                <TabsContent
                  key={div.id}
                  value={div.id}
                  className="mt-4 space-y-4"
                >
                  {div.brackets.length === 0 ? (
                    <EmptyState
                      icon={Trophy}
                      title="No bracket for this division yet"
                      description="Add the division again in Setup if this persists."
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
        </>
      )}
    </div>
  );
}
