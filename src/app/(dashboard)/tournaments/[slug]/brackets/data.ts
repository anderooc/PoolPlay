import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brackets,
  divisions,
  matches,
  poolTeams,
  pools,
  registrations,
  sets,
  teams,
} from "@/lib/db/schema";

/** Shape used by the Pools and Bracket tabs to render a division's play data. */
export type DivisionPlayData = {
  id: string;
  name: string;
  format: string;
  poolsReleasedAt: Date | null;
  pools: {
    id: string;
    name: string;
    teams: {
      id: string;
      name: string;
      university: string;
      seed: number | null;
    }[];
    matches: {
      id: string;
      teamAId: string | null;
      teamBId: string | null;
      winnerId: string | null;
      status: string;
      teamA: { id: string; name: string } | null;
      teamB: { id: string; name: string } | null;
      sets: { teamAScore: number; teamBScore: number }[];
    }[];
    matchCount: number;
  }[];
  brackets: {
    id: string;
    bracketType: string;
    seedCount: number;
    matches: {
      id: string;
      teamAId: string | null;
      teamBId: string | null;
      teamAName: string | null;
      teamBName: string | null;
      bracketRound: number | null;
      bracketPosition: number | null;
      winnerId: string | null;
      status: string;
    }[];
  }[];
  /** All confirmed registrations for the division, used for context. */
  eligibleTeams: { id: string; name: string; university: string }[];
};

/**
 * Resolves all the per-division data needed to render the Pools and Bracket
 * tabs. When `forOrganizer` is false, unreleased divisions return no pool or
 * bracket details so participants cannot see them early.
 */
export async function getDivisionPlayData(
  tournamentId: string,
  options?: { forOrganizer?: boolean }
): Promise<DivisionPlayData[]> {
  const forOrganizer = options?.forOrganizer ?? false;

  const tournamentDivisions = await db
    .select()
    .from(divisions)
    .where(eq(divisions.tournamentId, tournamentId))
    .orderBy(asc(divisions.name), asc(divisions.id));

  const rows: DivisionPlayData[] = [];

  for (const div of tournamentDivisions) {
    const eligibleTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        university: teams.university,
      })
      .from(registrations)
      .innerJoin(teams, eq(registrations.teamId, teams.id))
      .where(
        and(
          eq(registrations.tournamentId, tournamentId),
          eq(registrations.divisionId, div.id),
          eq(registrations.status, "confirmed")
        )
      )
      .orderBy(asc(registrations.registeredAt), asc(teams.name));

    const divPools = await db
      .select()
      .from(pools)
      .where(eq(pools.divisionId, div.id))
      .orderBy(asc(pools.createdAt), asc(pools.id));

    const poolData: DivisionPlayData["pools"] = [];
    for (const pool of divPools) {
      const pTeams = await db
        .select({
          id: teams.id,
          name: teams.name,
          university: teams.university,
          seed: poolTeams.seed,
        })
        .from(poolTeams)
        .innerJoin(teams, eq(poolTeams.teamId, teams.id))
        .where(eq(poolTeams.poolId, pool.id))
        .orderBy(asc(poolTeams.seed), asc(teams.name));

      const poolMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.poolId, pool.id))
        .orderBy(asc(matches.createdAt), asc(matches.id));

      const matchData: DivisionPlayData["pools"][number]["matches"] = [];
      for (const m of poolMatches) {
        const matchSets = await db
          .select()
          .from(sets)
          .where(eq(sets.matchId, m.id));

        const teamA = m.teamAId
          ? (pTeams.find((t) => t.id === m.teamAId) ?? null)
          : null;
        const teamB = m.teamBId
          ? (pTeams.find((t) => t.id === m.teamBId) ?? null)
          : null;

        matchData.push({
          id: m.id,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          winnerId: m.winnerId,
          status: m.status,
          sets: matchSets.map((s) => ({
            teamAScore: s.teamAScore,
            teamBScore: s.teamBScore,
          })),
          teamA: teamA ? { id: teamA.id, name: teamA.name } : null,
          teamB: teamB ? { id: teamB.id, name: teamB.name } : null,
        });
      }

      poolData.push({
        id: pool.id,
        name: pool.name,
        teams: pTeams,
        matches: matchData,
        matchCount: poolMatches.length,
      });
    }

    const divBrackets = await db
      .select()
      .from(brackets)
      .where(eq(brackets.divisionId, div.id));

    const bracketData: DivisionPlayData["brackets"] = [];
    for (const bracket of divBrackets) {
      const bracketMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.bracketId, bracket.id));

      const allTeamIds = [
        ...new Set(
          bracketMatches
            .flatMap((m) => [m.teamAId, m.teamBId])
            .filter((v): v is string => Boolean(v))
        ),
      ];

      const teamMap = new Map<string, string>();
      for (const tid of allTeamIds) {
        const [t] = await db
          .select({ id: teams.id, name: teams.name })
          .from(teams)
          .where(eq(teams.id, tid));
        if (t) teamMap.set(t.id, t.name);
      }

      bracketData.push({
        id: bracket.id,
        bracketType: bracket.bracketType,
        seedCount: bracket.seedCount,
        matches: bracketMatches.map((m) => ({
          id: m.id,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          teamAName: m.teamAId ? (teamMap.get(m.teamAId) ?? null) : null,
          teamBName: m.teamBId ? (teamMap.get(m.teamBId) ?? null) : null,
          bracketRound: m.bracketRound,
          bracketPosition: m.bracketPosition,
          winnerId: m.winnerId,
          status: m.status,
        })),
      });
    }

    const released = div.poolsReleasedAt != null;
    const canShowPlay = forOrganizer || released;

    rows.push({
      id: div.id,
      name: div.name,
      format: div.format,
      poolsReleasedAt: div.poolsReleasedAt,
      pools: canShowPlay ? poolData : [],
      brackets: canShowPlay ? bracketData : [],
      eligibleTeams: canShowPlay ? eligibleTeams : [],
    });
  }

  return rows;
}
