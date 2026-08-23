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

export const TEAM_GENDER_VALUES = ["mens", "womens"] as const;
export const TEAM_REGION_VALUES = [
  "north",
  "northeast",
  "east",
  "east_central",
  "central",
  "south",
  "southeast",
  "west",
  "northwest",
] as const;

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

/** Today as `YYYY-MM-DD` in the device's local timezone. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parses a `YYYY-MM-DD` calendar date as local midnight. */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isTournamentArchived(
  tournamentDate: string,
  today: string = todayISO()
): boolean {
  return tournamentDate < today;
}

export function tournamentListStatusLabel(
  status: string,
  tournamentDate: string,
  today: string = todayISO()
): string {
  if (isTournamentArchived(tournamentDate, today)) return "Archived";
  return TOURNAMENT_STATUS_LABELS[status] ?? status;
}

export function formatScheduleHeading(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRailDate(iso: string): {
  weekday: string;
  monthDay: string;
} {
  const date = parseISODate(iso);
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    monthDay: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  };
}

export function formatMonthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function registrationAvailabilityLabel(availability: {
  capacity: number | null;
  registeredCount: number;
  waitlistCount: number;
}): string {
  const registered =
    availability.capacity == null
      ? `${availability.registeredCount} registered`
      : `${availability.registeredCount} / ${availability.capacity} registered`;
  return `${registered} · ${availability.waitlistCount} waiting`;
}

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
