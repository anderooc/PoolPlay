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

/** Session hint so the schedule can land on a tournament after its date changes. */
const STORAGE_KEY = "brackt:tournament-schedule-focus";

export type TournamentScheduleFocus = {
  date: string;
  slug: string;
};

export function setTournamentScheduleFocus(focus: TournamentScheduleFocus) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(focus));
  } catch {
    // Private mode / quota — schedule still works without the hint.
  }
}

export function takeTournamentScheduleFocus(): TournamentScheduleFocus | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as Partial<TournamentScheduleFocus>;
    if (
      typeof parsed.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) &&
      typeof parsed.slug === "string" &&
      parsed.slug.length > 0
    ) {
      return { date: parsed.date, slug: parsed.slug };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}
