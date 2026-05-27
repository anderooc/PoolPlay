import type { MatchFormat } from "@/lib/labels/match-format";

export interface MatchFormatSettings {
  format: MatchFormat;
  startingScore: number;
  targetScore: number;
  tiebreakTargetScore: number;
}

export interface CompletedSet {
  teamAScore: number;
  teamBScore: number;
}

export interface MatchOutcome {
  status: "in_progress" | "completed";
  /** Winner team id or null when the match is a tie or still in progress. */
  winnerId: string | null;
  /** Number of sets played so far. */
  setsPlayed: number;
  /** True when the match is fully resolved per the format rules. */
  isFinished: boolean;
  /** True when no more sets should be added (caller should finalize). */
  shouldFinalize: boolean;
}

/**
 * How many sets a single match should contain for the given format. Used to
 * default the next set number and decide when to auto-finalize.
 */
export function totalSetsForFormat(format: MatchFormat): {
  required: number;
  max: number;
} {
  switch (format) {
    case "play_all_3":
      return { required: 3, max: 3 };
    case "best_of_2":
      return { required: 2, max: 2 };
    case "two_with_tiebreak":
      return { required: 2, max: 3 };
  }
}

/** Target score for the given set number under the format. */
export function targetForSet(
  settings: Pick<
    MatchFormatSettings,
    "format" | "targetScore" | "tiebreakTargetScore"
  >,
  setNumber: number
): number {
  if (settings.format === "two_with_tiebreak" && setNumber >= 3) {
    return settings.tiebreakTargetScore;
  }
  return settings.targetScore;
}

/**
 * Resolve the current outcome of a match given the completed set scores. Used
 * after an incremental score save so the server can auto-finalize the match.
 */
export function evaluateMatchOutcome(
  settings: Pick<MatchFormatSettings, "format">,
  teamAId: string,
  teamBId: string,
  completedSets: CompletedSet[]
): MatchOutcome {
  const setsPlayed = completedSets.length;
  let aSetsWon = 0;
  let bSetsWon = 0;
  for (const s of completedSets) {
    if (s.teamAScore > s.teamBScore) aSetsWon++;
    else if (s.teamBScore > s.teamAScore) bSetsWon++;
  }

  const { required, max } = totalSetsForFormat(settings.format);

  if (setsPlayed < required) {
    return {
      status: "in_progress",
      winnerId: null,
      setsPlayed,
      isFinished: false,
      shouldFinalize: false,
    };
  }

  if (settings.format === "two_with_tiebreak") {
    if (aSetsWon === bSetsWon && setsPlayed < max) {
      return {
        status: "in_progress",
        winnerId: null,
        setsPlayed,
        isFinished: false,
        shouldFinalize: false,
      };
    }
  }

  let winnerId: string | null = null;
  if (aSetsWon > bSetsWon) winnerId = teamAId;
  else if (bSetsWon > aSetsWon) winnerId = teamBId;

  return {
    status: "completed",
    winnerId,
    setsPlayed,
    isFinished: true,
    shouldFinalize: true,
  };
}
