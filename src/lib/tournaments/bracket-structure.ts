import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brackets,
  divisions,
  matches,
  poolTeams,
  sets,
  tournaments,
} from "@/lib/db/schema";
import {
  bracketSlotCount,
  createEmptyDoubleEliminationBracket,
  createEmptySingleEliminationBracket,
  generateSingleEliminationBracket,
} from "@/lib/utils/bracket";
import { calculatePoolStandings } from "@/lib/utils/pool";
import { ensureDivisionAutoPool } from "./division-pools";
import { isPoolPlayComplete } from "./pool-matches";

type DbClient = typeof db;

/**
 * Create an empty bracket tree when a pool (division) is added in Setup.
 * Uses team cap to size the bracket; slots stay TBD until teams qualify.
 */
export async function ensureDivisionBracketSkeleton(
  divisionId: string,
  format: string,
  teamCap: number | null,
  client: DbClient = db
): Promise<void> {
  if (
    format !== "pool_to_bracket" &&
    format !== "single_elimination" &&
    format !== "double_elimination"
  ) {
    return;
  }

  const existing = await client
    .select({ id: brackets.id })
    .from(brackets)
    .where(eq(brackets.divisionId, divisionId))
    .limit(1);

  if (existing.length > 0) return;

  const slots = bracketSlotCount(teamCap);
  const bracketType =
    format === "double_elimination"
      ? "double_elimination"
      : "single_elimination";

  const [bracket] = await client
    .insert(brackets)
    .values({
      divisionId,
      bracketType,
      seedCount: slots,
    })
    .returning();

  if (!bracket) return;

  if (format === "double_elimination") {
    const { winners, losers, grandFinal } =
      createEmptyDoubleEliminationBracket(slots);
    for (const m of winners) {
      await client.insert(matches).values({
        bracketId: bracket.id,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        bracketRound: m.round,
        bracketPosition: m.position,
        status: "upcoming",
      });
    }
    for (const m of losers) {
      await client.insert(matches).values({
        bracketId: bracket.id,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        bracketRound: m.round,
        bracketPosition: m.position,
        status: "upcoming",
      });
    }
    await client.insert(matches).values({
      bracketId: bracket.id,
      teamAId: grandFinal.teamAId,
      teamBId: grandFinal.teamBId,
      bracketRound: grandFinal.round,
      bracketPosition: grandFinal.position,
      status: "upcoming",
    });
    return;
  }

  const skeleton = createEmptySingleEliminationBracket(slots);
  for (const m of skeleton) {
    await client.insert(matches).values({
      bracketId: bracket.id,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      bracketRound: m.round,
      bracketPosition: m.position,
      status: "upcoming",
    });
  }
}

async function bracketRoundOneHasTeams(
  bracketId: string,
  client: DbClient
): Promise<boolean> {
  const roundOne = await client
    .select({
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
    })
    .from(matches)
    .where(
      and(eq(matches.bracketId, bracketId), eq(matches.bracketRound, 1))
    );

  return roundOne.some((m) => m.teamAId != null || m.teamBId != null);
}

/**
 * Place seeded teams into round 1 of an existing bracket skeleton.
 */
export async function fillBracketRoundOne(
  bracketId: string,
  seededTeamIds: string[],
  client: DbClient = db
): Promise<{ error?: string }> {
  if (seededTeamIds.length < 2) {
    return { error: "Need at least 2 teams for the bracket" };
  }

  if (await bracketRoundOneHasTeams(bracketId, client)) {
    return {};
  }

  const generated = generateSingleEliminationBracket(seededTeamIds);
  const roundOne = generated.filter((m) => m.round === 1);

  const existing = await client
    .select({
      id: matches.id,
      bracketPosition: matches.bracketPosition,
    })
    .from(matches)
    .where(
      and(eq(matches.bracketId, bracketId), eq(matches.bracketRound, 1))
    )
    .orderBy(asc(matches.bracketPosition));

  if (existing.length !== roundOne.length) {
    return { error: "Bracket structure does not match team count" };
  }

  for (let i = 0; i < existing.length; i++) {
    const slot = roundOne[i];
    await client
      .update(matches)
      .set({
        teamAId: slot.teamAId,
        teamBId: slot.teamBId,
      })
      .where(eq(matches.id, existing[i].id));
  }

  await client
    .update(brackets)
    .set({ seedCount: seededTeamIds.length })
    .where(eq(brackets.id, bracketId));

  return {};
}

/**
 * After pool play, advance standings into the bracket (pool-to-bracket format).
 */
export async function tryFillBracketFromPoolPlay(
  divisionId: string,
  client: DbClient = db
): Promise<void> {
  const [division] = await client
    .select({ format: divisions.format, teamCap: divisions.teamCap })
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);

  if (!division || division.format !== "pool_to_bracket") return;

  const [tournament] = await client
    .select({ poolTiebreakCriteria: tournaments.poolTiebreakCriteria })
    .from(tournaments)
    .innerJoin(divisions, eq(tournaments.id, divisions.tournamentId))
    .where(eq(divisions.id, divisionId))
    .limit(1);

  const poolId = await ensureDivisionAutoPool(divisionId, client);
  if (!poolId) return;

  const complete = await isPoolPlayComplete(poolId, client);
  if (!complete) return;

  const pTeams = await client
    .select({ teamId: poolTeams.teamId })
    .from(poolTeams)
    .where(eq(poolTeams.poolId, poolId))
    .orderBy(asc(poolTeams.seed));

  const matchResults = await client
    .select({
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
      winnerId: matches.winnerId,
      id: matches.id,
    })
    .from(matches)
    .where(eq(matches.poolId, poolId));

  const enriched = await Promise.all(
    matchResults
      .filter((m) => m.teamAId && m.teamBId)
      .map(async (m) => {
        const matchSets = await client
          .select({
            teamAScore: sets.teamAScore,
            teamBScore: sets.teamBScore,
          })
          .from(sets)
          .where(eq(sets.matchId, m.id));
        return {
          teamAId: m.teamAId!,
          teamBId: m.teamBId!,
          winnerId: m.winnerId,
          sets: matchSets,
        };
      })
  );

  const standings = calculatePoolStandings(
    pTeams.map((t) => t.teamId),
    enriched,
    { criteria: tournament?.poolTiebreakCriteria }
  );

  const advanceCount = bracketSlotCount(division.teamCap);
  const advancing = standings.slice(0, advanceCount).map((s) => s.teamId);

  const [bracket] = await client
    .select({ id: brackets.id })
    .from(brackets)
    .where(eq(brackets.divisionId, divisionId))
    .limit(1);

  if (!bracket) return;

  await fillBracketRoundOne(bracket.id, advancing, client);
}

/**
 * Single-elimination pools: fill round 1 from seed order once teams are set.
 */
export async function tryFillBracketFromDivisionSeeds(
  divisionId: string,
  client: DbClient = db
): Promise<void> {
  const [division] = await client
    .select({ format: divisions.format })
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);

  if (!division || division.format !== "single_elimination") return;

  const poolId = await ensureDivisionAutoPool(divisionId, client);
  if (!poolId) return;

  const members = await client
    .select({ teamId: poolTeams.teamId })
    .from(poolTeams)
    .where(eq(poolTeams.poolId, poolId))
    .orderBy(asc(poolTeams.seed));

  if (members.length < 2) return;

  const [bracket] = await client
    .select({ id: brackets.id })
    .from(brackets)
    .where(eq(brackets.divisionId, divisionId))
    .limit(1);

  if (!bracket) return;

  await fillBracketRoundOne(
    bracket.id,
    members.map((m) => m.teamId),
    client
  );
}
