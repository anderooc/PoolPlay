export type PoolTiebreakCriterion =
  | "match_record"
  | "set_record"
  | "point_diff"
  | "head_to_head";

export const POOL_TIEBREAK_CRITERIA: readonly PoolTiebreakCriterion[] = [
  "match_record",
  "set_record",
  "point_diff",
  "head_to_head",
] as const;

const LABELS: Record<PoolTiebreakCriterion, string> = {
  match_record: "Match record (W-L)",
  set_record: "Set record (sets won-lost)",
  point_diff: "Point differential (+/-)",
  head_to_head: "Head-to-head (2-team tie)",
};

const HINTS: Record<PoolTiebreakCriterion, string> = {
  match_record: "Higher match win percentage ranks above.",
  set_record: "Break ties using set differential / set record.",
  point_diff: "Break ties using total points for minus points against.",
  head_to_head:
    "Only applies when exactly two teams remain tied after earlier criteria.",
};

export function formatPoolTiebreakCriterionLabel(
  c: PoolTiebreakCriterion
): string {
  return LABELS[c];
}

export function formatPoolTiebreakCriterionHint(
  c: PoolTiebreakCriterion
): string {
  return HINTS[c];
}

