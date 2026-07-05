export interface BracketMatch {
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
}

/** Pad team count up to the next power of two (minimum 2). */
export function bracketSizeForTeamCount(teamCount: number): number {
  return nextPowerOf2(Math.max(2, teamCount));
}

/** Number of opening-round byes when seeding `teamCount` teams. */
export function byeCountForTeamCount(teamCount: number): number {
  return bracketSizeForTeamCount(teamCount) - teamCount;
}

/** Round-1 match with exactly one team (the other slot is a bye). */
export function isByeMatch(
  match: Pick<BracketMatch, "teamAId" | "teamBId">
): boolean {
  return Boolean(
    (match.teamAId && !match.teamBId) || (!match.teamAId && match.teamBId)
  );
}

export function byeWinnerId(
  match: Pick<BracketMatch, "teamAId" | "teamBId">
): string | null {
  if (match.teamAId && !match.teamBId) return match.teamAId;
  if (match.teamBId && !match.teamAId) return match.teamBId;
  return null;
}

/** Where a round-1 bye winner is placed in round 2 (1-indexed positions). */
export function roundOneAdvanceTarget(roundOnePosition: number): {
  round: number;
  position: number;
  slot: "A" | "B";
} {
  return {
    round: 2,
    position: Math.ceil(roundOnePosition / 2),
    slot: roundOnePosition % 2 === 1 ? "A" : "B",
  };
}

/**
 * Generates a single-elimination bracket from seeded teams (best → worst).
 * Pads to the next power of two; top seeds receive byes via standard bracket
 * seeding (1 vs 16, 8 vs 9, …).
 */
export function generateSingleEliminationBracket(
  seededTeamIds: string[]
): BracketMatch[] {
  const n = seededTeamIds.length;
  if (n < 2) return [];

  const bracketSize = bracketSizeForTeamCount(n);
  const totalRounds = Math.log2(bracketSize);

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
  const bracketSize = bracketSizeForTeamCount(n);
  const winnerRounds = Math.log2(bracketSize);

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

/** Default bracket slot count for empty skeletons before teams are seeded. */
export const DEFAULT_BRACKET_SLOTS = 8;

/** @deprecated Prefer bracketSizeForTeamCount for seeding. */
export function bracketSlotCount(slotCount: number | null | undefined): number {
  if (slotCount != null && slotCount >= 2) return slotCount;
  return DEFAULT_BRACKET_SLOTS;
}

/**
 * Full single-elimination match tree with TBD slots. `teamCount` is the number
 * of real teams; the tree is sized to the next power of two.
 */
export function createEmptySingleEliminationBracket(teamCount: number): BracketMatch[] {
  const size = bracketSizeForTeamCount(teamCount);
  return generateSingleEliminationBracket(Array<string>(size).fill("BYE"));
}

/** Double-elimination skeleton (winners + losers + grand final), all slots TBD. */
export function createEmptyDoubleEliminationBracket(teamCount: number): {
  winners: BracketMatch[];
  losers: BracketMatch[];
  grandFinal: BracketMatch;
} {
  const size = bracketSizeForTeamCount(teamCount);
  return generateDoubleEliminationBracket(Array<string>(size).fill("BYE"));
}

/** Count distinct real teams currently placed in a bracket. */
export function countPlacedTeams(
  matches: { teamAId: string | null; teamBId: string | null }[]
): number {
  const ids = new Set<string>();
  for (const m of matches) {
    if (m.teamAId) ids.add(m.teamAId);
    if (m.teamBId) ids.add(m.teamBId);
  }
  return ids.size;
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
