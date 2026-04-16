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

/**
 * Generates all round-robin matches within a pool.
 */
export function generatePoolMatches(
  teamIds: string[]
): { teamAId: string; teamBId: string }[] {
  const matches: { teamAId: string; teamBId: string }[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({ teamAId: teamIds[i], teamBId: teamIds[j] });
    }
  }
  return matches;
}

export interface PoolStanding {
  teamId: string;
  wins: number;
  losses: number;
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
    s.pointDiff = s.pointsFor - s.pointsAgainst;
  }

  // Sort by wins desc, then point diff desc
  result.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointDiff - a.pointDiff;
  });

  return result;
}
