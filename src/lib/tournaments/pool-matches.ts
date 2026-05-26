import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, poolTeams } from "@/lib/db/schema";
import { generatePoolMatches } from "@/lib/utils/pool";

type DbClient = typeof db;

/**
 * Rebuild round-robin pool matches from the current seed order. Only allowed
 * when every existing pool match is still upcoming.
 */
export async function regeneratePoolMatchesFromSeeds(
  poolId: string,
  client: DbClient = db
): Promise<{ error?: string; matchCount?: number }> {
  const members = await client
    .select({ teamId: poolTeams.teamId, seed: poolTeams.seed })
    .from(poolTeams)
    .where(eq(poolTeams.poolId, poolId))
    .orderBy(asc(poolTeams.seed), asc(poolTeams.teamId));

  if (members.length < 2) {
    return { error: "Need at least 2 teams to create pool matches" };
  }

  const existing = await client
    .select({ id: matches.id, status: matches.status })
    .from(matches)
    .where(eq(matches.poolId, poolId));

  const blocked = existing.some((m) => m.status !== "upcoming");
  if (blocked) {
    return {
      error:
        "Pool matches have already started. Seeding cannot be changed.",
    };
  }

  if (existing.length > 0) {
    await client.delete(matches).where(eq(matches.poolId, poolId));
  }

  const teamIds = members.map((m) => m.teamId);
  const matchups = generatePoolMatches(teamIds);

  for (const matchup of matchups) {
    await client.insert(matches).values({
      poolId,
      teamAId: matchup.teamAId,
      teamBId: matchup.teamBId,
      status: "upcoming",
    });
  }

  return { matchCount: matchups.length };
}

/** True when every pool match is completed (or there are none). */
export async function isPoolPlayComplete(
  poolId: string,
  client: DbClient = db
): Promise<boolean> {
  const rows = await client
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.poolId, poolId));

  if (rows.length === 0) return false;
  return rows.every((m) => m.status === "completed");
}

/** Whether any pool match has left the upcoming state. */
export async function poolMatchesHaveStarted(
  poolId: string,
  client: DbClient = db
): Promise<boolean> {
  const rows = await client
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.poolId, poolId));

  return rows.some((m) => m.status !== "upcoming");
}
