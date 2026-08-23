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

import type { TournamentListItemContract } from "@/lib/api/contracts/tournament";
import type { TeamGender, TeamRegion } from "@/types";
import { isTournamentArchived, toISODate } from "~/lib/format";

export interface TournamentListFilters {
  query: string;
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
  hideArchived: boolean;
  registrationOpenOnly: boolean;
  today: string;
  now: string;
}

export interface DateGroup {
  date: string;
  tournaments: TournamentListItemContract[];
}

export function toggleSetValue<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function countActiveTournamentFilters({
  genderFilter,
  regionFilter,
  hideArchived,
  registrationOpenOnly,
  defaultHideArchived = false,
}: {
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
  hideArchived: boolean;
  registrationOpenOnly: boolean;
  defaultHideArchived?: boolean;
}): number {
  let count = genderFilter.size + regionFilter.size;
  if (registrationOpenOnly) count += 1;
  if (hideArchived !== defaultHideArchived) count += 1;
  return count;
}

export function registrationAvailabilityOpen(
  status: string,
  deadline: string | null | undefined,
  now: string
): boolean {
  if (status !== "registration_open") return false;
  if (deadline == null) return true;
  const deadlineMs = Date.parse(deadline);
  const nowMs = Date.parse(now);
  return (
    Number.isFinite(deadlineMs) &&
    Number.isFinite(nowMs) &&
    nowMs < deadlineMs
  );
}

export function filterTournamentList(
  tournaments: TournamentListItemContract[],
  filters: TournamentListFilters
): TournamentListItemContract[] {
  let list = tournaments;
  const query = filters.query.trim().toLowerCase();
  if (query) {
    list = list.filter((tournament) => {
      const haystack = `${tournament.name} ${tournament.location} ${
        tournament.description ?? ""
      } ${tournament.hostSchool?.name ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }
  if (filters.hideArchived) {
    list = list.filter(
      (tournament) => !isTournamentArchived(tournament.date, filters.today)
    );
  }
  if (filters.registrationOpenOnly) {
    list = list.filter(
      (tournament) =>
        !isTournamentArchived(tournament.date, filters.today) &&
        registrationAvailabilityOpen(
          tournament.status,
          tournament.registrationAvailability.deadline,
          filters.now
        )
    );
  }
  if (filters.genderFilter.size > 0) {
    list = list.filter((tournament) =>
      filters.genderFilter.has(tournament.gender)
    );
  }
  if (filters.regionFilter.size > 0) {
    list = list.filter((tournament) =>
      filters.regionFilter.has(tournament.region)
    );
  }
  return list;
}

export function groupByDate(
  list: TournamentListItemContract[]
): DateGroup[] {
  const map = new Map<string, TournamentListItemContract[]>();
  for (const tournament of list) {
    const existing = map.get(tournament.date);
    if (existing) existing.push(tournament);
    else map.set(tournament.date, [tournament]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tournaments]) => ({ date, tournaments }));
}

/**
 * Date rail groups: event days plus today and the active selection so empty
 * days can still be focused from the calendar.
 */
export function buildScheduleGroups(
  tournaments: TournamentListItemContract[],
  { today, selectedDate }: { today: string; selectedDate: string }
): DateGroup[] {
  const grouped = groupByDate(
    [...tournaments].sort((a, b) => a.date.localeCompare(b.date))
  );
  const required = new Set<string>([today, selectedDate]);
  for (const date of required) {
    if (grouped.some((group) => group.date === date)) continue;
    const insertAt = grouped.findIndex((group) => group.date > date);
    const empty: DateGroup = { date, tournaments: [] };
    if (insertAt === -1) grouped.push(empty);
    else grouped.splice(insertAt, 0, empty);
  }
  return grouped;
}

/** Sunday-first month grid, padded to full weeks. */
export function monthCellIsos(
  year: number,
  monthIndex: number
): (string | null)[] {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toISODate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number
): { year: number; monthIndex: number } {
  const next = new Date(year, monthIndex + delta, 1);
  return { year: next.getFullYear(), monthIndex: next.getMonth() };
}

export function emptyScheduleCopy({
  loadedCount,
  query,
  hasActiveFilters,
}: {
  loadedCount: number;
  query: string;
  hasActiveFilters: boolean;
}): { title: string; body: string } {
  if (loadedCount === 0) {
    return {
      title: "No tournaments yet",
      body: "Check back soon for upcoming events.",
    };
  }
  const trimmed = query.trim();
  if (trimmed && hasActiveFilters) {
    return {
      title: "No matches",
      body: `Nothing matches “${trimmed}” with the selected filters.`,
    };
  }
  if (trimmed) {
    return {
      title: "No matches",
      body: `Nothing matches “${trimmed}”. Try a different search.`,
    };
  }
  if (hasActiveFilters) {
    return {
      title: "No matches",
      body: "No tournaments match your filters. Try clearing filters or showing past events.",
    };
  }
  return {
    title: "No tournaments yet",
    body: "Check back soon for upcoming events.",
  };
}
