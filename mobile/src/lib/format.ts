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

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  in_progress: "In progress",
  completed: "Completed",
};

export const GENDER_LABELS: Record<string, string> = {
  mens: "Men's",
  womens: "Women's",
};

export const REGION_LABELS: Record<string, string> = {
  north: "North",
  northeast: "Northeast",
  east: "East",
  east_central: "East Central",
  central: "Central/Midwest",
  south: "South",
  southeast: "Southeast",
  west: "West",
  northwest: "Northwest",
};

export const DIVISION_FORMAT_LABELS: Record<string, string> = {
  pool_to_bracket: "Group play to bracket",
  single_elimination: "Single elimination",
  double_elimination: "Double elimination",
};

/** Formats a `YYYY-MM-DD` calendar date without shifting it across a timezone. */
export function formatCalendarDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const MATCH_STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  in_progress: "Live",
  completed: "Final",
};

export function formatMatchTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSetLine(
  sets: { setNumber: number; teamAScore: number; teamBScore: number }[]
): string | null {
  if (sets.length === 0) return null;
  return sets
    .slice()
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((set) => `${set.teamAScore}–${set.teamBScore}`)
    .join("  ");
}

export const BRACKET_TYPE_LABELS: Record<string, string> = {
  single_elimination: "Single elimination",
  double_elimination: "Double elimination",
};

export function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function bracketRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semis";
  if (round === totalRounds - 2) return "Quarters";
  return `Round ${round}`;
}

export function formatDeadline(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
