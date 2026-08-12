/*
 * brackt - Collegiate club volleyball tournament hub
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

interface Team {
  id: string;
  university: string;
}

interface Pool {
  name: string;
  teams: Team[];
}

/**
 * Distributes teams across pools, attempting to avoid placing teams
 * from the same university in the same pool.
 */
export function generatePools(teams: Team[], poolCount: number): Pool[] {
  if (poolCount < 1) poolCount = 1;

  const poolBuckets: Team[][] = Array.from({ length: poolCount }, () => []);
  const poolNames = Array.from(
    { length: poolCount },
    (_, i) => `Pool ${String.fromCharCode(65 + i)}`
  );

  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  // Group by university to spread them out
  const byUniversity = new Map<string, Team[]>();
  for (const team of shuffled) {
    const key = team.university.toLowerCase();
    if (!byUniversity.has(key)) byUniversity.set(key, []);
    byUniversity.get(key)!.push(team);
  }

  // Sort university groups by size descending (distribute larger groups first)
  const groups = [...byUniversity.values()].sort(
    (a, b) => b.length - a.length
  );

  // Round-robin distribute, trying to avoid same-university in same pool
  let poolIndex = 0;
  for (const group of groups) {
    for (const team of group) {
      poolBuckets[poolIndex].push(team);
      poolIndex = (poolIndex + 1) % poolCount;
    }
  }

  return poolBuckets.map((teamList, i) => ({
    name: poolNames[i],
    teams: teamList,
  }));
}

const BYE = -1;

/**
 * Circle-method slot order so round 1 pairs seed 2 vs lowest seed.
 * `teamIds` must be sorted by seed ascending (seed 1 at index 0).
 */
function initialCircleSlots(n: number): number[] {
  if (n === 2) return [0, 1];

  const secondSeed = 1;
  const lowest = n - 1;

  if (n % 2 === 0) {
    // e.g. 4 teams → [1, 0, 2, 3] → first pairing 2v4, then 1v3
    return [
      secondSeed,
      0,
      ...Array.from({ length: n - 3 }, (_, i) => i + 2),
      lowest,
    ];
  }

  // Odd pool: phantom bye so round 1 is still 2v(lowest)
  // e.g. 3 teams → [1, 0, bye, 2] → 2v3 first
  return [
    secondSeed,
    0,
    ...Array.from({ length: n - 3 }, (_, i) => i + 2),
    BYE,
    lowest,
  ];
}

export interface PoolMatchup {
  teamAId: string;
  teamBId: string;
  refTeamId: string | null;
}

/**
 * Assigns each matchup a working team that is not playing. Distribution is
 * fair: every team refs once before any repeats (when eligibility allows).
 * `teamIds` must be sorted by seed ascending.
 */
export function assignRefsToMatchups(
  teamIds: string[],
  matchups: { teamAId: string; teamBId: string }[]
): PoolMatchup[] {
  const refCounts = new Map<string, number>(teamIds.map((id) => [id, 0]));
  const seedIndex = new Map<string, number>(
    teamIds.map((id, index) => [id, index])
  );

  return matchups.map((m) => {
    const eligible = teamIds.filter(
      (id) => id !== m.teamAId && id !== m.teamBId
    );
    if (eligible.length === 0) {
      return { ...m, refTeamId: null };
    }

    // Pick the eligible team with the fewest prior ref assignments.
    // This ensures every team refs once before repeats whenever possible.
    let minCount = Number.POSITIVE_INFINITY;
    for (const id of eligible) {
      minCount = Math.min(minCount, refCounts.get(id) ?? 0);
    }

    const candidates = eligible.filter((id) => (refCounts.get(id) ?? 0) === minCount);
    candidates.sort((a, b) => {
      // Stable, deterministic tie-breaker: prefer lower seeds (higher index)
      // when counts are equal, so the assignment is predictable.
      return (seedIndex.get(b) ?? 0) - (seedIndex.get(a) ?? 0);
    });

    const refTeamId = candidates[0];
    refCounts.set(refTeamId, (refCounts.get(refTeamId) ?? 0) + 1);
    return { ...m, refTeamId };
  });
}

/**
 * Round-robin match order for a pool. `teamIds` must be sorted by seed ascending
 * (seed 1 first, lowest seed last). The first match is always lowest vs seed 2;
 * remaining rounds follow the circle method (with a bye for odd pools).
 */
export function generatePoolMatches(
  teamIds: string[]
): { teamAId: string; teamBId: string }[] {
  const n = teamIds.length;
  if (n < 2) return [];

  let slots = initialCircleSlots(n);
  const m = slots.length;
  const matches: { teamAId: string; teamBId: string }[] = [];

  for (let round = 0; round < m - 1; round++) {
    for (let i = 0; i < m / 2; i++) {
      const a = slots[i];
      const b = slots[m - 1 - i];
      if (a === BYE || b === BYE) continue;
      matches.push({ teamAId: teamIds[a], teamBId: teamIds[b] });
    }
    const fixed = slots[0];
    const rest = slots.slice(1);
    slots = [fixed, rest[rest.length - 1], ...rest.slice(0, -1)];
  }

  return matches;
}

export interface PoolStanding {
  teamId: string;
  wins: number;
  losses: number;
  /** Sets won across all matches, including non-deciding sets in play_all_3. */
  setsWon: number;
  setsLost: number;
  setDiff: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
}

export function calculatePoolStandings(
  teamIds: string[],
  matchResults: {
    teamAId: string;
    teamBId: string;
    winnerId: string | null;
    sets: { teamAScore: number; teamBScore: number }[];
  }[],
  options?: {
    /** Ordered criteria for breaking ties (highest priority first). */
    criteria?: Array<"match_record" | "set_record" | "point_diff" | "head_to_head">;
  }
): PoolStanding[] {
  const criteria =
    options?.criteria ??
    (["match_record", "set_record", "point_diff", "head_to_head"] as const);

  const standings = new Map<string, PoolStanding>();

  for (const id of teamIds) {
    standings.set(id, {
      teamId: id,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      setDiff: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
    });
  }

  for (const match of matchResults) {
    const a = standings.get(match.teamAId);
    const b = standings.get(match.teamBId);
    if (!a || !b) continue;

    for (const set of match.sets) {
      a.pointsFor += set.teamAScore;
      a.pointsAgainst += set.teamBScore;
      b.pointsFor += set.teamBScore;
      b.pointsAgainst += set.teamAScore;

      if (set.teamAScore > set.teamBScore) {
        a.setsWon++;
        b.setsLost++;
      } else if (set.teamBScore > set.teamAScore) {
        b.setsWon++;
        a.setsLost++;
      }
    }

    if (match.winnerId === match.teamAId) {
      a.wins++;
      b.losses++;
    } else if (match.winnerId === match.teamBId) {
      b.wins++;
      a.losses++;
    }
  }

  const result = [...standings.values()];
  for (const s of result) {
    s.setDiff = s.setsWon - s.setsLost;
    s.pointDiff = s.pointsFor - s.pointsAgainst;
  }

  type H2H = { smallId: string; largeId: string; smallWins: number; largeWins: number };
  const headToHeadWins = new Map<string, H2H>();
  function h2hKey(a: string, b: string) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }
  for (const m of matchResults) {
    if (!m.winnerId) continue;
    const key = h2hKey(m.teamAId, m.teamBId);
    const smallId = m.teamAId < m.teamBId ? m.teamAId : m.teamBId;
    const largeId = m.teamAId < m.teamBId ? m.teamBId : m.teamAId;
    const entry =
      headToHeadWins.get(key) ?? ({ smallId, largeId, smallWins: 0, largeWins: 0 } satisfies H2H);
    if (m.winnerId === smallId) entry.smallWins++;
    else if (m.winnerId === largeId) entry.largeWins++;
    headToHeadWins.set(key, entry);
  }

  result.sort((a, b) => {
    for (const c of criteria) {
      if (c === "match_record") {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.losses !== a.losses) return a.losses - b.losses;
        continue;
      }
      if (c === "set_record") {
        if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
        if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
        continue;
      }
      if (c === "point_diff") {
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        continue;
      }
      if (c === "head_to_head") {
        const key = h2hKey(a.teamId, b.teamId);
        const entry = headToHeadWins.get(key);
        if (!entry) continue;
        if (entry.smallWins === entry.largeWins) continue;
        const aWins = a.teamId === entry.smallId ? entry.smallWins : entry.largeWins;
        const bWins = b.teamId === entry.smallId ? entry.smallWins : entry.largeWins;
        if (aWins !== bWins) return bWins - aWins;
        continue;
      }
    }
    return 0;
  });

  return result;
}
