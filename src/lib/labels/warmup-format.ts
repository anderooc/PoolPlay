export type WarmupFormat = "none" | "three_three_one";

const WARMUP_LABELS: Record<WarmupFormat, string> = {
  none: "No warmup",
  three_three_one: "3-3-1 (3 min hits each, 1 min serves)",
};

const WARMUP_MINUTES: Record<WarmupFormat, number> = {
  none: 0,
  three_three_one: 7,
};

export const WARMUP_FORMATS: readonly WarmupFormat[] = [
  "none",
  "three_three_one",
] as const;

export function formatWarmupFormatLabel(format: WarmupFormat): string {
  return WARMUP_LABELS[format];
}

export function warmupMinutesForFormat(format: WarmupFormat): number {
  return WARMUP_MINUTES[format];
}
