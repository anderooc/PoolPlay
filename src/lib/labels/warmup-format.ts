export type WarmupFormat = "none" | "three_three_one";

export type WarmupTeamKey = "a" | "b";

export type WarmupPhase = {
  /** Short label shown above the countdown (e.g. "Team A hitting"). */
  label: string;
  durationSeconds: number;
  teamKey: WarmupTeamKey;
  teamName: string;
  activity: "hitting" | "serving";
};

const WARMUP_LABELS: Record<WarmupFormat, string> = {
  none: "No warmup",
  three_three_one:
    "3+1 each (3 min hits, then 1 min serves per team)",
};

/** Total reserved minutes for auto-scheduling. */
const WARMUP_MINUTES: Record<WarmupFormat, number> = {
  none: 0,
  // Per team: 3 min hitting + 1 min serving (order chosen on court).
  three_three_one: 8,
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

/**
 * Ordered countdown segments for the on-court warmup timer.
 * Each team runs hitting then serving back-to-back; `firstTeam` is who won
 * rock-paper-scissors and warms up first.
 */
export function warmupPhasesForFormat(
  format: WarmupFormat,
  teamAName = "Team A",
  teamBName = "Team B",
  firstTeam: WarmupTeamKey = "a"
): WarmupPhase[] {
  if (format === "none") return [];

  const first =
    firstTeam === "a"
      ? { key: "a" as const, name: teamAName }
      : { key: "b" as const, name: teamBName };
  const second =
    firstTeam === "a"
      ? { key: "b" as const, name: teamBName }
      : { key: "a" as const, name: teamAName };

  const blockFor = (team: { key: WarmupTeamKey; name: string }): WarmupPhase[] => [
    {
      label: `${team.name} hitting`,
      durationSeconds: 3 * 60,
      teamKey: team.key,
      teamName: team.name,
      activity: "hitting",
    },
    {
      label: `${team.name} serving`,
      durationSeconds: 60,
      teamKey: team.key,
      teamName: team.name,
      activity: "serving",
    },
  ];

  return [...blockFor(first), ...blockFor(second)];
}
