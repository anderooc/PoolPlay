/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { PoolTiebreakCriterion } from "@/lib/labels/pool-tiebreak";
import { formatPoolTiebreakCriterionLabel } from "@/lib/labels/pool-tiebreak";
import {
  bracketTierName,
  tierTeamCounts,
  validateBracketTierSettings,
} from "@/lib/tournaments/bracket-tiers";
import { calculatePoolStandings } from "@/lib/utils/pool";

/** Per-pool finish used to build the tournament-wide bracket order. */
export type PoolStandingSummary = {
  teamId: string;
  place: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointDiff: number;
  seed: number;
  poolName: string;
  divisionName: string;
  teamName: string;
  university: string;
};

export type BracketSeedingRow = {
  overallRank: number;
  teamId: string;
  teamName: string;
  university: string;
  poolName: string;
  divisionName: string;
  poolPlace: number;
  poolSeed: number | null;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointDiff: number;
  bracketTier: string | null;
  bracketSeed: number | null;
};

export type BracketSeedingReport = {
  rows: BracketSeedingRow[];
  allPoolsComplete: boolean;
  tiebreakCriteria: PoolTiebreakCriterion[];
};

export const CROSS_POOL_SEEDING_RULES =
  "Across pools, teams are ordered by pool finish (all 1st-place teams, then all 2nd-place, and so on). Within each finish group, ties are broken by match wins, then point differential, then original pool seed.";

type PoolInput = {
  poolName: string;
  divisionName: string;
  teams: {
    id: string;
    name: string;
    university: string;
    seed: number | null;
  }[];
  matches: {
    teamAId: string | null;
    teamBId: string | null;
    winnerId: string | null;
    status: string;
    sets: { teamAScore: number; teamBScore: number }[];
  }[];
};

/**
 * Order teams for combined gold / silver / bronze brackets from per-pool summaries.
 */
export function rankTeamsForCombinedBrackets(
  poolStandings: Pick<
    PoolStandingSummary,
    "teamId" | "place" | "wins" | "pointDiff" | "seed"
  >[][]
): string[] {
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

  return rankedIds;
}

export function assignBracketTiers(
  rankedTeamIds: string[],
  bracketCount: number,
  goldTeamCount: number | null,
  silverTeamCount: number | null
): Map<string, { tierName: string; seed: number }> {
  const validation = validateBracketTierSettings(
    rankedTeamIds.length,
    bracketCount,
    goldTeamCount,
    silverTeamCount
  );
  const tierSizes = validation.ok
    ? validation.tiers
    : tierTeamCounts(
        rankedTeamIds.length,
        bracketCount,
        goldTeamCount,
        silverTeamCount
      );

  const assignments = new Map<string, { tierName: string; seed: number }>();
  let offset = 0;

  for (let tier = 0; tier < tierSizes.length; tier++) {
    const n = tierSizes[tier];
    for (let i = 0; i < n; i++) {
      const teamId = rankedTeamIds[offset + i];
      if (!teamId) continue;
      assignments.set(teamId, {
        tierName: bracketTierName(tier),
        seed: i + 1,
      });
    }
    offset += n;
  }

  return assignments;
}

function summarizePool(
  pool: PoolInput,
  tiebreakCriteria: PoolTiebreakCriterion[]
): PoolStandingSummary[] {
  const teamById = new Map(pool.teams.map((t) => [t.id, t]));
  const standings = calculatePoolStandings(
    pool.teams.map((t) => t.id),
    pool.matches
      .filter((m) => m.teamAId && m.teamBId)
      .map((m) => ({
        teamAId: m.teamAId!,
        teamBId: m.teamBId!,
        winnerId: m.winnerId,
        sets: m.sets,
      })),
    { criteria: tiebreakCriteria }
  );

  return standings.map((s, i) => {
    const team = teamById.get(s.teamId);
    return {
      teamId: s.teamId,
      place: i + 1,
      wins: s.wins,
      losses: s.losses,
      setsWon: s.setsWon,
      setsLost: s.setsLost,
      pointDiff: s.pointDiff,
      seed: team?.seed ?? Number.MAX_SAFE_INTEGER,
      poolName: pool.poolName,
      divisionName: pool.divisionName,
      teamName: team?.name ?? "Unknown",
      university: team?.university ?? "",
    };
  });
}

function poolIsComplete(pool: PoolInput): boolean {
  if (pool.matches.length === 0) return false;
  return pool.matches.every((m) => m.status === "completed");
}

/** Build the full seeding table from pool play data and bracket settings. */
export function buildBracketSeedingReport(input: {
  pools: PoolInput[];
  tiebreakCriteria: PoolTiebreakCriterion[];
  bracketCount: number;
  goldTeamCount: number | null;
  silverTeamCount: number | null;
}): BracketSeedingReport {
  const summariesPerPool = input.pools.map((pool) =>
    summarizePool(pool, input.tiebreakCriteria)
  );

  const rankedIds = rankTeamsForCombinedBrackets(summariesPerPool);
  const tierByTeam = assignBracketTiers(
    rankedIds,
    input.bracketCount,
    input.goldTeamCount,
    input.silverTeamCount
  );

  const summaryByTeam = new Map(
    summariesPerPool.flat().map((s) => [s.teamId, s])
  );

  const rows: BracketSeedingRow[] = rankedIds.map((teamId, index) => {
    const s = summaryByTeam.get(teamId)!;
    const tier = tierByTeam.get(teamId);
    return {
      overallRank: index + 1,
      teamId,
      teamName: s.teamName,
      university: s.university,
      poolName: s.poolName,
      divisionName: s.divisionName,
      poolPlace: s.place,
      poolSeed: s.seed === Number.MAX_SAFE_INTEGER ? null : s.seed,
      wins: s.wins,
      losses: s.losses,
      setsWon: s.setsWon,
      setsLost: s.setsLost,
      pointDiff: s.pointDiff,
      bracketTier: tier?.tierName ?? null,
      bracketSeed: tier?.seed ?? null,
    };
  });

  return {
    rows,
    allPoolsComplete: input.pools.length > 0 && input.pools.every(poolIsComplete),
    tiebreakCriteria: input.tiebreakCriteria,
  };
}

export function formatTiebreakCriteriaList(
  criteria: PoolTiebreakCriterion[]
): string {
  return criteria.map(formatPoolTiebreakCriterionLabel).join(" → ");
}
