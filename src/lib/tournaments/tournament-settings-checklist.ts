import type { PoolTiebreakCriterion } from "@/lib/labels/pool-tiebreak";

export const DEFAULT_POOL_MATCH_FORMAT = "two_with_tiebreak" as const;
export const DEFAULT_POOL_WARMUP_FORMAT = "three_three_one" as const;
export const DEFAULT_POOL_TIEBREAK_CRITERIA: PoolTiebreakCriterion[] = [
  "match_record",
  "set_record",
  "point_diff",
  "head_to_head",
];

export type PoolSettingsCheckInput = {
  matchFormat: string;
  setStartingScore: number;
  setTargetScore: number;
  tiebreakTargetScore: number;
  warmupFormat: string;
  poolTiebreakCriteria: readonly string[];
  poolSettingsSavedAt: Date | null;
  hasPoolMatches: boolean;
};

export type BracketSettingsCheckInput = {
  playFormat: string;
  bracketCount: number;
  goldTeamCount: number | null;
  silverTeamCount: number | null;
  bracketSettingsSavedAt: Date | null;
};

function tiebreakCriteriaEqual(
  a: readonly string[],
  b: readonly string[]
): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function poolSettingsUseDefaults(input: PoolSettingsCheckInput): boolean {
  return (
    input.matchFormat === DEFAULT_POOL_MATCH_FORMAT &&
    input.setStartingScore === 0 &&
    input.setTargetScore === 25 &&
    input.tiebreakTargetScore === 15 &&
    input.warmupFormat === DEFAULT_POOL_WARMUP_FORMAT &&
    tiebreakCriteriaEqual(input.poolTiebreakCriteria, DEFAULT_POOL_TIEBREAK_CRITERIA)
  );
}

/** True when pool scoring / tiebreak rules are confirmed for play. */
export function poolSettingsChecklistComplete(
  input: PoolSettingsCheckInput
): boolean {
  if (input.poolSettingsSavedAt) return true;
  if (input.hasPoolMatches) return true;
  return !poolSettingsUseDefaults(input);
}

/** True when gold / silver / bronze tier splits are set (when needed). */
export function bracketSettingsChecklistComplete(
  input: BracketSettingsCheckInput
): boolean {
  if (input.playFormat !== "pool_to_bracket") return true;
  if (input.bracketSettingsSavedAt) return true;

  const count = Math.min(3, Math.max(1, Math.floor(input.bracketCount)));
  if (count <= 1) return true;

  const gold = input.goldTeamCount;
  if (gold == null || gold < 2) return false;
  if (count === 2) return true;

  const silver = input.silverTeamCount;
  return silver != null && silver >= 2;
}

export function poolSettingsChecklistHint(
  input: PoolSettingsCheckInput
): string {
  if (poolSettingsUseDefaults(input)) {
    return "Pools tab: open Pool settings and save scoring rules and tiebreak order (defaults are fine).";
  }
  return "Pools tab: review Pool settings before generating matches.";
}

export function bracketSettingsChecklistHint(
  input: BracketSettingsCheckInput
): string {
  const count = Math.min(3, Math.max(1, Math.floor(input.bracketCount)));
  if (count <= 1) {
    return "Bracket tab: open Bracket settings to confirm a single combined bracket.";
  }
  if (count === 2) {
    return "Bracket tab: set how many teams advance to gold; the rest go to silver.";
  }
  return "Bracket tab: set gold and silver team counts; remaining teams go to bronze.";
}
