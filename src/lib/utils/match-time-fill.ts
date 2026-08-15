/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export const DEFAULT_MATCH_INTERVAL_MINUTES = 60;
export const MIN_MATCH_INTERVAL_MINUTES = 5;
export const MAX_MATCH_INTERVAL_MINUTES = 180;

export type MatchTimeFillStatus = "upcoming" | "in_progress" | "completed";

export type MatchTimeFillInput = {
  id: string;
  groupId: string;
  groupName: string;
  /** Same wave => same start time (parallel courts). */
  wave: number;
  status: MatchTimeFillStatus;
  scheduledTime: Date | null;
  teamAName: string | null;
  teamBName: string | null;
  isBye: boolean;
};

export type MatchTimeFillKind = "apply" | "keep" | "locked";

export type MatchTimeFillRow = {
  matchId: string;
  groupName: string;
  label: string;
  wave: number;
  currentIso: string | null;
  proposedIso: string;
  kind: MatchTimeFillKind;
};

export type ScheduleTimesScope =
  | { type: "division-pools"; divisionId: string }
  | { type: "bracket"; bracketId: string };

export function clampMatchIntervalMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MATCH_INTERVAL_MINUTES;
  return Math.min(
    MAX_MATCH_INTERVAL_MINUTES,
    Math.max(MIN_MATCH_INTERVAL_MINUTES, Math.round(value))
  );
}

export function matchupLabel(
  teamAName: string | null,
  teamBName: string | null
): string {
  return `${teamAName ?? "TBD"} vs ${teamBName ?? "TBD"}`;
}

/**
 * Wave index is the match's order inside its pool (createdAt). Parallel pools
 * therefore share a start time at the same index.
 */
export function assignIndexWaves(
  orderedIdsByGroup: Map<string, string[]>
): Map<string, number> {
  const waveById = new Map<string, number>();
  for (const ids of orderedIdsByGroup.values()) {
    ids.forEach((id, index) => waveById.set(id, index));
  }
  return waveById;
}

export function fillableCount(rows: MatchTimeFillRow[]): number {
  return rows.filter((row) => row.kind === "apply").length;
}

export function minPlayableWave(matches: MatchTimeFillInput[]): number | null {
  let min: number | null = null;
  for (const match of matches) {
    if (match.isBye) continue;
    if (min == null || match.wave < min) min = match.wave;
  }
  return min;
}

/**
 * Propose start times from a first-wave clock time. Same wave copies that
 * time (parallel courts); later waves add `intervalMinutes`. Completed and
 * in-progress matches are locked. Existing times are kept unless overwrite.
 */
export function proposeMatchTimeFill({
  matches,
  firstStart,
  intervalMinutes,
  overwrite,
}: {
  matches: MatchTimeFillInput[];
  firstStart: Date;
  intervalMinutes: number;
  overwrite: boolean;
}): MatchTimeFillRow[] {
  const startWave = minPlayableWave(matches);
  if (startWave == null || Number.isNaN(firstStart.getTime())) return [];

  const intervalMs = clampMatchIntervalMinutes(intervalMinutes) * 60 * 1000;
  const startMs = firstStart.getTime();
  const rows: MatchTimeFillRow[] = [];

  for (const match of matches) {
    if (match.isBye) continue;
    const waveDelta = match.wave - startWave;
    const proposed = new Date(startMs + waveDelta * intervalMs);
    const proposedIso = proposed.toISOString();
    const currentIso = match.scheduledTime
      ? match.scheduledTime.toISOString()
      : null;
    const base = {
      matchId: match.id,
      groupName: match.groupName,
      label: matchupLabel(match.teamAName, match.teamBName),
      wave: match.wave,
      currentIso,
      proposedIso,
    };

    if (match.status !== "upcoming") {
      rows.push({ ...base, kind: "locked" });
      continue;
    }
    if (currentIso && !overwrite) {
      rows.push({ ...base, kind: "keep" });
      continue;
    }
    if (
      match.scheduledTime &&
      match.scheduledTime.getTime() === proposed.getTime()
    ) {
      rows.push({ ...base, kind: "keep" });
      continue;
    }
    rows.push({ ...base, kind: "apply" });
  }

  return rows.sort((a, b) => {
    if (a.wave !== b.wave) return a.wave - b.wave;
    const group = a.groupName.localeCompare(b.groupName);
    if (group !== 0) return group;
    return a.label.localeCompare(b.label);
  });
}
