export const PLAY_FORMATS = [
  "pool_to_bracket",
  "single_elimination",
  "double_elimination",
] as const;

export type PlayFormat = (typeof PLAY_FORMATS)[number];

const PLAY_FORMAT_LABELS: Record<PlayFormat, string> = {
  pool_to_bracket: "Group play to bracket",
  single_elimination: "Single elimination",
  double_elimination: "Double elimination",
};

const PLAY_FORMAT_DESCRIPTIONS: Record<PlayFormat, string> = {
  pool_to_bracket:
    "Teams play round-robin in pools, then top finishers advance to elimination brackets.",
  single_elimination:
    "Teams go straight into a single-elimination bracket; one loss eliminates a team.",
  double_elimination:
    "Teams play in winners and losers brackets; a team must lose twice to be eliminated.",
};

export function formatPlayFormatLabel(format: PlayFormat | string): string {
  return (
    PLAY_FORMAT_LABELS[format as PlayFormat] ??
    format.replace(/_/g, " ")
  );
}

export function playFormatDescription(format: PlayFormat | string): string {
  return (
    PLAY_FORMAT_DESCRIPTIONS[format as PlayFormat] ??
    ""
  );
}

export const PLAY_FORMAT_OPTIONS = PLAY_FORMATS.map((value) => ({
  value,
  label: PLAY_FORMAT_LABELS[value],
  description: PLAY_FORMAT_DESCRIPTIONS[value],
}));
