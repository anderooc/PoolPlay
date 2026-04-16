export interface BracketMatch {
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
}

/**
 * Generates a single-elimination bracket from seeded teams.
 * Fills in byes for non-power-of-2 counts.
 */
export function generateSingleEliminationBracket(
  seededTeamIds: string[]
): BracketMatch[] {
  const n = seededTeamIds.length;
  if (n < 2) return [];

  // Pad to next power of 2
  const bracketSize = nextPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);

  // Standard bracket seeding
  const seeds = bracketSeeding(bracketSize);
  const padded = [...seededTeamIds];
  while (padded.length < bracketSize) padded.push("BYE");

  const matches: BracketMatch[] = [];
  const firstRoundMatchups = seeds.length / 2;

  for (let i = 0; i < firstRoundMatchups; i++) {
    const teamA = padded[seeds[i * 2]];
    const teamB = padded[seeds[i * 2 + 1]];

    matches.push({
      round: 1,
      position: i + 1,
      teamAId: teamA === "BYE" ? null : teamA,
      teamBId: teamB === "BYE" ? null : teamB,
    });
  }

  // Create empty matches for subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let pos = 1; pos <= matchesInRound; pos++) {
      matches.push({
        round,
        position: pos,
        teamAId: null,
        teamBId: null,
      });
    }
  }

  return matches;
}

/**
 * Generates a double-elimination bracket structure.
 * Returns both winners and losers bracket matches.
 */
export function generateDoubleEliminationBracket(
  seededTeamIds: string[]
): { winners: BracketMatch[]; losers: BracketMatch[]; grandFinal: BracketMatch } {
  const winners = generateSingleEliminationBracket(seededTeamIds);
  const n = seededTeamIds.length;
  const bracketSize = nextPowerOf2(n);
  const winnerRounds = Math.log2(bracketSize);

  // Losers bracket has (winnerRounds - 1) * 2 rounds
  const loserRounds = (winnerRounds - 1) * 2;
  const losers: BracketMatch[] = [];

  let matchesInRound = bracketSize / 4;
  for (let round = 1; round <= loserRounds; round++) {
    if (round % 2 === 0 && matchesInRound > 1) {
      matchesInRound = matchesInRound / 2;
    }
    const actualMatches = Math.max(1, matchesInRound);
    for (let pos = 1; pos <= actualMatches; pos++) {
      losers.push({ round, position: pos, teamAId: null, teamBId: null });
    }
  }

  const grandFinal: BracketMatch = {
    round: 1,
    position: 1,
    teamAId: null,
    teamBId: null,
  };

  return { winners, losers, grandFinal };
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function bracketSeeding(size: number): number[] {
  if (size === 1) return [0];
  const half = bracketSeeding(size / 2);
  return half.flatMap((seed) => [seed, size - 1 - seed]);
}
