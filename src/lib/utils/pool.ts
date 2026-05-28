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
  }[]
): PoolStanding[] {
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

  // Sort by match wins, then set diff (handles ties under best_of_2),
  // finally point diff as the last tiebreaker.
  result.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    return b.pointDiff - a.pointDiff;
  });

  return result;
}
