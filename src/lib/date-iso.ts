/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import { todayISO } from "@/lib/tournament-status";

/** Years after the current calendar year included in date-picker year dropdowns. */
export const CALENDAR_YEARS_AHEAD = 2;

/** Parses a YYYY-MM-DD string into a local Date. Avoids UTC drift. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Formats a local Date as YYYY-MM-DD (matches `tournaments.date`). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Bounds for month/year dropdowns: current year through a few years ahead. */
export function getCalendarMonthBounds(isoDates: string[] = []) {
  const today = todayISO();
  const todayDate = parseISODate(today);
  const currentYear = todayDate.getFullYear();
  let endYear = currentYear + CALENDAR_YEARS_AHEAD;

  for (const iso of isoDates) {
    const year = parseISODate(iso).getFullYear();
    if (year > endYear) endYear = year;
  }

  return {
    startMonth: new Date(currentYear, 0, 1),
    endMonth: new Date(endYear, 11, 1),
    today,
  };
}

export function formatISODateLabel(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  }
): string {
  return parseISODate(iso).toLocaleDateString(undefined, options);
}

/** UI display for tournament dates: month/day first, year last (e.g. May 20, 2026). */
export function formatTournamentDateDisplay(
  iso: string,
  options: { weekday?: boolean } = {}
): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    ...(options.weekday ? { weekday: "long" } : {}),
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
