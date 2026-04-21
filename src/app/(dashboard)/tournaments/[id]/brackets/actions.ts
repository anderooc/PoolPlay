"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  divisions,
  tournaments,
  registrations,
  pools,
  poolTeams,
  brackets,
  matches,
  teams,
} from "@/lib/db/schema";
import { eq, and, count, ne, asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { generatePools, generatePoolMatches } from "@/lib/utils/pool";
import { generateSingleEliminationBracket } from "@/lib/utils/bracket";

/** Sets pool_teams.seed = 1..n sorted by division roster order (registration time, then team name). */
async function reseedPoolTeamsByDivisionOrder(
  poolId: string,
  tournamentId: string,
  divisionId: string
) {
  const divisionOrderRows = await db
    .select({ teamId: registrations.teamId })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.divisionId, divisionId),
        eq(registrations.status, "confirmed")
      )
    )
    .orderBy(asc(registrations.registeredAt), asc(teams.name));

  const orderIndex = new Map<string, number>();
  divisionOrderRows.forEach((r, i) => orderIndex.set(r.teamId, i));

  const poolRows = await db
    .select({ id: poolTeams.id, teamId: poolTeams.teamId })
    .from(poolTeams)
    .where(eq(poolTeams.poolId, poolId));

  const sorted = [...poolRows].sort((a, b) => {
    const oa = orderIndex.get(a.teamId) ?? 999999;
    const ob = orderIndex.get(b.teamId) ?? 999999;
    if (oa !== ob) return oa - ob;
    return a.teamId.localeCompare(b.teamId);
  });

  if (sorted.length === 0) return;

  await db.transaction(async (tx) => {
    await Promise.all(
      sorted.map((row, i) =>
        tx
          .update(poolTeams)
          .set({ seed: i + 1 })
          .where(eq(poolTeams.id, row.id))
      )
    );
  });
}

export async function generatePoolsForDivision(
  tournamentId: string,
  divisionId: string,
  poolCount: number
) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can generate pools" };
  }

  const divRegs = await db
    .select({
      teamId: registrations.teamId,
      university: teams.university,
    })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.divisionId, divisionId),
        eq(registrations.status, "confirmed")
      )
    )
    .orderBy(asc(registrations.registeredAt), asc(teams.name));

  if (divRegs.length < 2) {
    return { error: "Need at least 2 confirmed teams to generate pools" };
  }

  const teamData = divRegs.map((r) => ({
    id: r.teamId,
    university: r.university,
  }));

  const generatedPools = generatePools(teamData, poolCount);

  // Clear existing pools for this division
  const existingPools = await db
    .select({ id: pools.id })
    .from(pools)
    .where(eq(pools.divisionId, divisionId));

  for (const pool of existingPools) {
    await db.delete(matches).where(eq(matches.poolId, pool.id));
    await db.delete(poolTeams).where(eq(poolTeams.poolId, pool.id));
    await db.delete(pools).where(eq(pools.id, pool.id));
  }

  for (const pool of generatedPools) {
    const [createdPool] = await db
      .insert(pools)
      .values({ divisionId, name: pool.name })
      .returning();

    for (let i = 0; i < pool.teams.length; i++) {
      await db.insert(poolTeams).values({
        poolId: createdPool.id,
        teamId: pool.teams[i].id,
        seed: i + 1,
      });
    }

    await reseedPoolTeamsByDivisionOrder(
      createdPool.id,
      tournamentId,
      divisionId
    );

    const poolMatchups = generatePoolMatches(
      pool.teams.map((t) => t.id)
    );
    for (const matchup of poolMatchups) {
      await db.insert(matches).values({
        poolId: createdPool.id,
        teamAId: matchup.teamAId,
        teamBId: matchup.teamBId,
        status: "upcoming",
      });
    }
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/brackets`);
  return { success: true };
}

export async function generateBracketForDivision(
  tournamentId: string,
  divisionId: string,
  seededTeamIds: string[]
) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can generate brackets" };
  }

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);

  if (!division) return { error: "Division not found" };

  // Clear existing brackets
  const existingBrackets = await db
    .select({ id: brackets.id })
    .from(brackets)
    .where(eq(brackets.divisionId, divisionId));

  for (const bracket of existingBrackets) {
    await db.delete(matches).where(eq(matches.bracketId, bracket.id));
    await db.delete(brackets).where(eq(brackets.id, bracket.id));
  }

  const bracketType =
    division.format === "double_elimination"
      ? "double_elimination"
      : "single_elimination";

  const [bracket] = await db
    .insert(brackets)
    .values({
      divisionId,
      bracketType,
      seedCount: seededTeamIds.length,
    })
    .returning();

  const bracketMatches = generateSingleEliminationBracket(seededTeamIds);

  for (const m of bracketMatches) {
    await db.insert(matches).values({
      bracketId: bracket.id,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      bracketRound: m.round,
      bracketPosition: m.position,
      status: "upcoming",
    });
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/brackets`);
  return { success: true };
}

export async function addTeamToPool(
  tournamentId: string,
  poolId: string,
  teamId: string
) {
  const user = await requireUser();

  const [pool] = await db
    .select()
    .from(pools)
    .where(eq(pools.id, poolId))
    .limit(1);

  if (!pool) return { error: "Pool not found" };

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, pool.divisionId))
    .limit(1);

  if (!division) return { error: "Division not found" };

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, division.tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can assign teams to pools" };
  }

  if (tournament.id !== tournamentId) {
    return { error: "Tournament mismatch" };
  }

  const [{ value: matchCount }] = await db
    .select({ value: count() })
    .from(matches)
    .where(eq(matches.poolId, poolId));

  if (matchCount > 0) {
    return {
      error:
        "This pool has matches. Regenerate pools before changing team assignments.",
    };
  }

  const [reg] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.teamId, teamId),
        eq(registrations.divisionId, pool.divisionId),
        eq(registrations.status, "confirmed")
      )
    )
    .limit(1);

  if (!reg) {
    return {
      error:
        "Team must be confirmed and assigned to this division before pool placement.",
    };
  }

  const [alreadyHere] = await db
    .select()
    .from(poolTeams)
    .where(and(eq(poolTeams.poolId, poolId), eq(poolTeams.teamId, teamId)))
    .limit(1);

  if (alreadyHere) {
    return { error: "This team is already in this pool" };
  }

  const [inOtherPool] = await db
    .select({ id: poolTeams.id })
    .from(poolTeams)
    .innerJoin(pools, eq(poolTeams.poolId, pools.id))
    .where(
      and(
        eq(pools.divisionId, pool.divisionId),
        ne(pools.id, poolId),
        eq(poolTeams.teamId, teamId)
      )
    )
    .limit(1);

  if (inOtherPool) {
    return { error: "Team is already in another pool in this division" };
  }

  await db.insert(poolTeams).values({
    poolId,
    teamId,
    seed: 0,
  });

  await reseedPoolTeamsByDivisionOrder(
    poolId,
    tournamentId,
    pool.divisionId
  );

  revalidatePath(`/tournaments/${tournamentId}/brackets`);
  return { success: true };
}

export async function removeTeamFromPool(
  tournamentId: string,
  poolId: string,
  teamId: string
) {
  const user = await requireUser();

  const [pool] = await db
    .select()
    .from(pools)
    .where(eq(pools.id, poolId))
    .limit(1);

  if (!pool) return { error: "Pool not found" };

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, pool.divisionId))
    .limit(1);

  if (!division) return { error: "Division not found" };

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, division.tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can change pool assignments" };
  }

  if (tournament.id !== tournamentId) {
    return { error: "Tournament mismatch" };
  }

  const [{ value: matchCount }] = await db
    .select({ value: count() })
    .from(matches)
    .where(eq(matches.poolId, poolId));

  if (matchCount > 0) {
    return {
      error:
        "This pool has matches. Regenerate pools before removing teams.",
    };
  }

  await db
    .delete(poolTeams)
    .where(and(eq(poolTeams.poolId, poolId), eq(poolTeams.teamId, teamId)));

  await reseedPoolTeamsByDivisionOrder(
    poolId,
    tournamentId,
    pool.divisionId
  );

  revalidatePath(`/tournaments/${tournamentId}/brackets`);
  return { success: true };
}
