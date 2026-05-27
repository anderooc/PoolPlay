export type MatchFormat = "play_all_3" | "best_of_2" | "two_with_tiebreak";

const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  play_all_3: "Play all 3 sets",
  best_of_2: "Best of 2 (ties allowed)",
  two_with_tiebreak: "2 sets, 3rd if tied",
};

const MATCH_FORMAT_HINTS: Record<MatchFormat, string> = {
  play_all_3:
    "Every match plays 3 sets. Common in 3-team pools so each game runs the full series.",
  best_of_2:
    "Every match plays exactly 2 sets. A 1-1 split is allowed; pool standings break ties on points.",
  two_with_tiebreak:
    "Every match plays 2 sets. If teams split, play a shorter 3rd tiebreak set.",
};

export function formatMatchFormatLabel(format: MatchFormat): string {
  return MATCH_FORMAT_LABELS[format];
}

export function formatMatchFormatHint(format: MatchFormat): string {
  return MATCH_FORMAT_HINTS[format];
}

export const MATCH_FORMATS: readonly MatchFormat[] = [
  "play_all_3",
  "best_of_2",
  "two_with_tiebreak",
] as const;
