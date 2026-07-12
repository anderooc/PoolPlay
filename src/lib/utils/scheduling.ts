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

export interface ScheduleSlot {
  matchId: string;
  courtId: string;
  /** Time when play begins. Warmup runs from `scheduledTime - warmupMinutes`. */
  scheduledTime: Date;
}

/**
 * Auto-schedules matches across courts and time slots.
 * Each match supplies its own allowed court ids (e.g. division-scoped + shared).
 * Time advances in rounds of width max(court list length) to keep parallelism sensible.
 * `warmupMinutes` is added to each slot so the next match has time to warm up.
 */
export function autoScheduleMatchesWithCourtSets(
  items: { matchId: string; courtIds: string[] }[],
  startTime: Date,
  matchDurationMinutes: number = 30,
  warmupMinutes: number = 0
): ScheduleSlot[] {
  const valid = items.filter((i) => i.courtIds.length > 0);
  if (valid.length === 0) return [];

  const maxCourts = Math.max(...valid.map((i) => i.courtIds.length), 1);
  const slotMinutes = matchDurationMinutes + warmupMinutes;
  const slots: ScheduleSlot[] = [];

  for (let i = 0; i < valid.length; i++) {
    const item = valid[i];
    const pool = item.courtIds;
    const courtId = pool[i % pool.length];
    const timeIdx = Math.floor(i / maxCourts);
    const slotStart = startTime.getTime() + timeIdx * slotMinutes * 60 * 1000;
    // Warmup runs first; play starts after the warmup window.
    const scheduledTime = new Date(slotStart + warmupMinutes * 60 * 1000);
    slots.push({ matchId: item.matchId, courtId, scheduledTime });
  }

  return slots;
}

/**
 * Auto-schedules matches when every match may use the same court list.
 */
export function autoScheduleMatches(
  matchIds: string[],
  courtIds: string[],
  startTime: Date,
  matchDurationMinutes: number = 30,
  warmupMinutes: number = 0
): ScheduleSlot[] {
  if (courtIds.length === 0 || matchIds.length === 0) return [];
  return autoScheduleMatchesWithCourtSets(
    matchIds.map((matchId) => ({ matchId, courtIds })),
    startTime,
    matchDurationMinutes,
    warmupMinutes
  );
}
