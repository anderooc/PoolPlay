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
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { generatePools, generatePoolMatches } from "@/lib/utils/pool";
import { generateSingleEliminationBracket } from "@/lib/utils/bracket";

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
        eq(registrations.divisionId, divisionId),
        eq(registrations.status, "confirmed")
      )
    );

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
  return { success: true };
}
