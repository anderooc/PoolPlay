import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brackets,
  divisions,
  matches,
  poolTeams,
  sets,
  teams,
  tournaments,
} from "@/lib/db/schema";
import {
  bracketSizeForTeamCount,
  byeWinnerId,
  createEmptyDoubleEliminationBracket,
  createEmptySingleEliminationBracket,
  generateSingleEliminationBracket,
  isByeMatch,
  roundOneAdvanceTarget,
} from "@/lib/utils/bracket";
import { calculatePoolStandings } from "@/lib/utils/pool";
import { ensureDivisionAutoPool } from "./division-pools";
import { isPoolPlayComplete } from "./pool-matches";
import { getTakenMatchSlugsInTournament } from "@/lib/tournaments/match-query";
import {
  bracketPlaceholderSlug,
  matchupSlugFromTeamSlugs,
  reserveMatchSlug,
} from "@/lib/tournaments/match-slug";
import {
  bracketTierName,
  tierTeamCounts,
} from "@/lib/tournaments/bracket-tiers";

type DbClient = typeof db;

async function divisionBracketsHaveTeams(
  divisionId: string,
  client: DbClient
): Promise<boolean> {
  const rows = await client
    .select({
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
    })
    .from(matches)
    .innerJoin(brackets, eq(matches.bracketId, brackets.id))
    .where(eq(brackets.divisionId, divisionId));

  return rows.some((m) => m.teamAId != null || m.teamBId != null);
}

/** True when a bracket has match rows but no teams have been placed yet. */
async function bracketHasUnseededTree(
  bracketId: string,
  client: DbClient
): Promise<boolean> {
  const rows = await client
    .select({
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
    })
    .from(matches)
    .where(eq(matches.bracketId, bracketId));

  if (rows.length === 0) return false;
  return !rows.some((m) => m.teamAId != null || m.teamBId != null);
}

/**
 * Drop pre-built match trees that were sized before we knew the team count
 * (legacy 8-team skeletons). Seeding will rebuild at the correct size.
 */
async function resetUnseededBracketTree(
  bracketId: string,
  client: DbClient
): Promise<void> {
  if (!(await bracketHasUnseededTree(bracketId, client))) return;

  await client.delete(matches).where(eq(matches.bracketId, bracketId));
  await client
    .update(brackets)
    .set({ seedCount: 0 })
    .where(eq(brackets.id, bracketId));
}

async function insertBracketTree(
  client: DbClient,
  tournamentId: string,
  bracketId: string,
  format: string,
  slots: number,
  taken: Set<string>
) {
  async function insertBracketMatch(m: {
    teamAId: string | null;
    teamBId: string | null;
    round: number;
    position: number;
  }) {
    const slug = reserveMatchSlug(
      bracketPlaceholderSlug(m.round, m.position),
      taken
    );
    await client.insert(matches).values({
      tournamentId,
      slug,
      bracketId,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      bracketRound: m.round,
      bracketPosition: m.position,
      status: "upcoming",
    });
  }

  if (format === "double_elimination") {
    const { winners, losers, grandFinal } =
      createEmptyDoubleEliminationBracket(slots);
    for (const m of winners) await insertBracketMatch(m);
    for (const m of losers) await insertBracketMatch(m);
    await insertBracketMatch(grandFinal);
    return;
  }

  const skeleton = createEmptySingleEliminationBracket(slots);
  for (const m of skeleton) await insertBracketMatch(m);
}

/**
 * Create empty bracket tree(s). Pool-to-bracket pools share one tournament-wide
 * gold / silver / bronze structure (owned by the first pool division).
 */
export async function ensureDivisionBracketSkeleton(
  divisionId: string,
  format: string,
  client: DbClient = db
): Promise<void> {
  if (
    format !== "pool_to_bracket" &&
    format !== "single_elimination" &&
    format !== "double_elimination"
  ) {
    return;
  }

  const [division] = await client
    .select({ tournamentId: divisions.tournamentId })
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);
  if (!division) return;

  if (format === "pool_to_bracket") {
    await ensureTournamentCombinedBrackets(division.tournamentId, client);
    return;
  }

  // Straight elimination formats keep a single per-division bracket.
  const existing = await client
    .select({ id: brackets.id })
    .from(brackets)
    .where(eq(brackets.divisionId, divisionId))
    .limit(1);
  if (existing.length > 0) {
    await resetUnseededBracketTree(existing[0].id, client);
    return;
  }
  if (await divisionBracketsHaveTeams(divisionId, client)) return;

  const bracketType =
    format === "double_elimination"
      ? "double_elimination"
      : "single_elimination";
  await client.insert(brackets).values({
    divisionId,
    bracketType,
    seedCount: 0,
    name: null,
    tier: 0,
  });
}

/**
 * All pool-to-bracket pools share one set of tier brackets on the first pool
 * division. Other pool divisions do not get their own brackets.
 */
export async function ensureTournamentCombinedBrackets(
  tournamentId: string,
  client: DbClient = db
): Promise<void> {
  const [tournament] = await client
    .select({
      bracketCount: tournaments.bracketCount,
      goldTeamCount: tournaments.goldTeamCount,
      silverTeamCount: tournaments.silverTeamCount,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament) return;

  const poolDivisions = await client
    .select({
      id: divisions.id,
    })
    .from(divisions)
    .where(
      and(
        eq(divisions.tournamentId, tournamentId),
        eq(divisions.format, "pool_to_bracket")
      )
    )
    .orderBy(asc(divisions.createdAt), asc(divisions.id));

  if (poolDivisions.length === 0) return;

  const ownerId = poolDivisions[0].id;

  let anyFilled = false;
  for (const div of poolDivisions) {
    if (await divisionBracketsHaveTeams(div.id, client)) {
      anyFilled = true;
      break;
    }
  }

  // Non-owner pool divisions never keep their own brackets.
  for (const div of poolDivisions) {
    if (div.id === ownerId) continue;
    if (await divisionBracketsHaveTeams(div.id, client)) continue;
    const stray = await client
      .select({ id: brackets.id })
      .from(brackets)
      .where(eq(brackets.divisionId, div.id));
    for (const b of stray) {
      await client.delete(matches).where(eq(matches.bracketId, b.id));
      await client.delete(brackets).where(eq(brackets.id, b.id));
    }
  }

  if (anyFilled) return;

  const existingOwner = await client
    .select({ id: brackets.id, tier: brackets.tier })
    .from(brackets)
    .where(eq(brackets.divisionId, ownerId))
    .orderBy(asc(brackets.tier));

  const desiredCount = Math.min(3, Math.max(1, tournament.bracketCount ?? 1));

  if (existingOwner.length === desiredCount) {
    for (const b of existingOwner) {
      await resetUnseededBracketTree(b.id, client);
    }
    return;
  }

  for (const b of existingOwner) {
    await client.delete(matches).where(eq(matches.bracketId, b.id));
    await client.delete(brackets).where(eq(brackets.id, b.id));
  }

  // Bracket shells only — match trees are built when pool play finishes and
  // we know the actual team count (with byes padded to the next power of two).
  for (let tier = 0; tier < desiredCount; tier++) {
    await client.insert(brackets).values({
      divisionId: ownerId,
      bracketType: "single_elimination",
      seedCount: 0,
      name: desiredCount > 1 ? bracketTierName(tier) : null,
      tier,
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

async function bracketHasPlayBeyondByes(
  bracketId: string,
  client: DbClient
): Promise<boolean> {
  const rows = await client
    .select({
      bracketRound: matches.bracketRound,
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.bracketId, bracketId));

  return rows.some((m) => {
    if (m.bracketRound != null && m.bracketRound > 1 && m.status === "completed") {
      return true;
    }
    if (m.status !== "completed") return false;
    // Completed round-1 match with two real teams means play has started.
    return Boolean(m.teamAId && m.teamBId);
  });
}

async function bracketIsSeededForTeamCount(
  bracketId: string,
  teamCount: number,
  client: DbClient
): Promise<boolean> {
  const [bracket] = await client
    .select({ seedCount: brackets.seedCount })
    .from(brackets)
    .where(eq(brackets.id, bracketId))
    .limit(1);

  if (!bracket || bracket.seedCount !== teamCount) return false;

  const expectedRoundOne = bracketSizeForTeamCount(teamCount) / 2;
  const currentRoundOne = await countRoundOneMatches(bracketId, client);
  if (currentRoundOne !== expectedRoundOne) return false;

  return bracketRoundOneHasTeams(bracketId, client);
}

async function countRoundOneMatches(
  bracketId: string,
  client: DbClient
): Promise<number> {
  const rows = await client
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(eq(matches.bracketId, bracketId), eq(matches.bracketRound, 1))
    );
  return rows.length;
}

async function rebuildBracketTree(
  client: DbClient,
  tournamentId: string,
  bracketId: string,
  format: string,
  teamCount: number,
  taken: Set<string>
): Promise<void> {
  await client.delete(matches).where(eq(matches.bracketId, bracketId));
  await insertBracketTree(
    client,
    tournamentId,
    bracketId,
    format,
    teamCount,
    taken
  );
  await client
    .update(brackets)
    .set({ seedCount: teamCount })
    .where(eq(brackets.id, bracketId));
}

/**
 * After round-1 byes are seeded, mark those matches complete and place
 * winners into the correct round-2 slots.
 */
async function applyRoundOneByeAdvancement(
  bracketId: string,
  roundOneSlots: ReturnType<typeof generateSingleEliminationBracket>,
  client: DbClient
): Promise<void> {
  const roundTwoRows = await client
    .select({
      id: matches.id,
      bracketPosition: matches.bracketPosition,
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
    })
    .from(matches)
    .where(
      and(eq(matches.bracketId, bracketId), eq(matches.bracketRound, 2))
    )
    .orderBy(asc(matches.bracketPosition));

  const roundTwoByPosition = new Map(
    roundTwoRows.map((row) => [row.bracketPosition ?? 0, row])
  );

  for (const slot of roundOneSlots) {
    if (slot.round !== 1 || !isByeMatch(slot)) continue;

    const winnerId = byeWinnerId(slot);
    if (!winnerId) continue;

    const [roundOneRow] = await client
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.bracketId, bracketId),
          eq(matches.bracketRound, 1),
          eq(matches.bracketPosition, slot.position)
        )
      )
      .limit(1);

    if (!roundOneRow) continue;

    await client
      .update(matches)
      .set({
        teamAId: slot.teamAId,
        teamBId: slot.teamBId,
        winnerId,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(matches.id, roundOneRow.id));

    const feed = roundOneAdvanceTarget(slot.position);
    const roundTwo = roundTwoByPosition.get(feed.position);
    if (!roundTwo) continue;

    const teamAId =
      feed.slot === "A" ? winnerId : roundTwo.teamAId;
    const teamBId =
      feed.slot === "B" ? winnerId : roundTwo.teamBId;

    await client
      .update(matches)
      .set({ teamAId, teamBId })
      .where(eq(matches.id, roundTwo.id));

    roundTwoByPosition.set(feed.position, {
      ...roundTwo,
      teamAId,
      teamBId,
    });
  }
}

/**
 * Place seeded teams into round 1 of an existing bracket skeleton, sized to
 * the next power of two. Top seeds receive byes and advance to round 2.
 */
export async function fillBracketRoundOne(
  bracketId: string,
  seededTeamIds: string[],
  client: DbClient = db
): Promise<{ error?: string }> {
  if (seededTeamIds.length < 2) {
    return { error: "Need at least 2 teams for the bracket" };
  }

  const teamCount = seededTeamIds.length;

  if (await bracketIsSeededForTeamCount(bracketId, teamCount, client)) {
    return {};
  }

  if (await bracketHasPlayBeyondByes(bracketId, client)) {
    return { error: "Bracket play has started — cannot re-seed" };
  }

  const expectedRoundOneMatches = bracketSizeForTeamCount(teamCount) / 2;
  let currentRoundOneMatches = await countRoundOneMatches(bracketId, client);

  const [bracketRow] = await client
    .select({ seedCount: brackets.seedCount })
    .from(brackets)
    .where(eq(brackets.id, bracketId))
    .limit(1);

  if (
    bracketRow &&
    bracketRow.seedCount !== 0 &&
    bracketRow.seedCount !== teamCount &&
    !(await bracketRoundOneHasTeams(bracketId, client))
  ) {
    await client.delete(matches).where(eq(matches.bracketId, bracketId));
    await client
      .update(brackets)
      .set({ seedCount: 0 })
      .where(eq(brackets.id, bracketId));
    currentRoundOneMatches = 0;
  }

  if (
    currentRoundOneMatches > 0 &&
    currentRoundOneMatches !== expectedRoundOneMatches
  ) {
    await client.delete(matches).where(eq(matches.bracketId, bracketId));
    currentRoundOneMatches = 0;
  }

  const [bracketMeta] = await client
    .select({
      tournamentId: divisions.tournamentId,
      format: divisions.format,
    })
    .from(brackets)
    .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
    .where(eq(brackets.id, bracketId))
    .limit(1);

  if (!bracketMeta?.tournamentId) return { error: "Bracket not found" };

  const format = bracketMeta.format ?? "pool_to_bracket";

  if (currentRoundOneMatches !== expectedRoundOneMatches) {
    const taken = await getTakenMatchSlugsInTournament(
      bracketMeta.tournamentId,
      [],
      client
    );
    await rebuildBracketTree(
      client,
      bracketMeta.tournamentId,
      bracketId,
      format,
      teamCount,
      taken
    );
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

  const teamIds = [
    ...new Set(
      roundOne
        .flatMap((s) => [s.teamAId, s.teamBId])
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const teamSlugRows =
    teamIds.length > 0
      ? await client
          .select({ id: teams.id, slug: teams.slug })
          .from(teams)
          .where(inArray(teams.id, teamIds))
      : [];
  const slugByTeamId = new Map(teamSlugRows.map((t) => [t.id, t.slug]));

  for (let i = 0; i < existing.length; i++) {
    const slot = roundOne[i];
    const matchId = existing[i].id;

    let slug: string | undefined;
    if (slot.teamAId && slot.teamBId) {
      const teamASlug = slugByTeamId.get(slot.teamAId);
      const teamBSlug = slugByTeamId.get(slot.teamBId);
      if (teamASlug && teamBSlug) {
        const taken = await getTakenMatchSlugsInTournament(
          bracketMeta.tournamentId,
          [matchId],
          client
        );
        slug = reserveMatchSlug(
          matchupSlugFromTeamSlugs(teamASlug, teamBSlug),
          taken
        );
      }
    }

    await client
      .update(matches)
      .set({
        teamAId: slot.teamAId,
        teamBId: slot.teamBId,
        ...(slug ? { slug } : {}),
      })
      .where(eq(matches.id, matchId));
  }

  await applyRoundOneByeAdvancement(bracketId, roundOne, client);

  await client
    .update(brackets)
    .set({ seedCount: teamCount })
    .where(eq(brackets.id, bracketId));

  return {};
}

/**
 * After any pool finishes, try to fill tournament-wide gold/silver/bronze from
 * all pools combined. No-ops until every pool-to-bracket pool is complete.
 */
export async function tryFillBracketFromPoolPlay(
  divisionId: string,
  client: DbClient = db
): Promise<void> {
  const [division] = await client
    .select({
      format: divisions.format,
      tournamentId: divisions.tournamentId,
    })
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);

  if (!division || division.format !== "pool_to_bracket") return;
  await tryFillTournamentCombinedBrackets(division.tournamentId, client);
}

/**
 * Combine standings from every pool (place 1s, then place 2s, …) and seed
 * tournament gold / silver / bronze brackets.
 */
export async function tryFillTournamentCombinedBrackets(
  tournamentId: string,
  client: DbClient = db
): Promise<void> {
  const [tournament] = await client
    .select({
      poolTiebreakCriteria: tournaments.poolTiebreakCriteria,
      bracketCount: tournaments.bracketCount,
      goldTeamCount: tournaments.goldTeamCount,
      silverTeamCount: tournaments.silverTeamCount,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament) return;

  const poolDivisions = await client
    .select({ id: divisions.id })
    .from(divisions)
    .where(
      and(
        eq(divisions.tournamentId, tournamentId),
        eq(divisions.format, "pool_to_bracket")
      )
    )
    .orderBy(asc(divisions.createdAt), asc(divisions.id));

  if (poolDivisions.length === 0) return;

  const poolStandings: {
    teamId: string;
    place: number;
    wins: number;
    pointDiff: number;
    seed: number;
  }[][] = [];

  for (const div of poolDivisions) {
    const poolId = await ensureDivisionAutoPool(div.id, client);
    if (!poolId) return;
    const complete = await isPoolPlayComplete(poolId, client);
    if (!complete) return;

    const pTeams = await client
      .select({ teamId: poolTeams.teamId, seed: poolTeams.seed })
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
      { criteria: tournament.poolTiebreakCriteria }
    );

    const seedByTeam = new Map(
      pTeams.map((t) => [t.teamId, t.seed ?? Number.MAX_SAFE_INTEGER])
    );

    poolStandings.push(
      standings.map((s, i) => ({
        teamId: s.teamId,
        place: i + 1,
        wins: s.wins,
        pointDiff: s.pointDiff,
        seed: seedByTeam.get(s.teamId) ?? Number.MAX_SAFE_INTEGER,
      }))
    );
  }

  // Combine pools: all 1st-place teams, then all 2nds, etc. Within a place,
  // order by record, then original pool seed (lower = higher seed).
  const maxPlace = Math.max(0, ...poolStandings.map((s) => s.length));
  const rankedIds: string[] = [];
  for (let place = 1; place <= maxPlace; place++) {
    const atPlace = poolStandings
      .flatMap((s) => s.filter((t) => t.place === place))
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.pointDiff - a.pointDiff ||
          a.seed - b.seed
      );
    for (const t of atPlace) rankedIds.push(t.teamId);
  }

  const counts = tierTeamCounts(
    rankedIds.length,
    tournament.bracketCount ?? 1,
    tournament.goldTeamCount,
    tournament.silverTeamCount
  );

  await ensureTournamentCombinedBrackets(tournamentId, client);

  const ownerId = poolDivisions[0].id;
  const tierBrackets = await client
    .select({
      id: brackets.id,
      tier: brackets.tier,
      seedCount: brackets.seedCount,
    })
    .from(brackets)
    .where(eq(brackets.divisionId, ownerId))
    .orderBy(asc(brackets.tier));

  let offset = 0;
  for (let tier = 0; tier < counts.length; tier++) {
    const n = counts[tier];
    const teamIds = rankedIds.slice(offset, offset + n);
    offset += n;
    if (teamIds.length < 2) continue;

    const bracket = tierBrackets.find((b) => b.tier === tier);
    if (!bracket) continue;

    await fillBracketRoundOne(bracket.id, teamIds, client);
  }
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
