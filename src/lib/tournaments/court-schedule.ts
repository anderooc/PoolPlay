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

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import {
  findCourtScheduleConflict,
  type CourtScheduleOccupant,
} from "@/lib/utils/court-schedule-conflict";

export async function loadTournamentCourtOccupancy(
  tournamentId: string
): Promise<CourtScheduleOccupant[]> {
  const rows = await db
    .select({
      matchId: matches.id,
      courtId: matches.courtId,
      scheduledTime: matches.scheduledTime,
    })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        isNotNull(matches.courtId),
        isNotNull(matches.scheduledTime)
      )
    );

  return rows.flatMap((row) => {
    if (!row.courtId || !row.scheduledTime) return [];
    return [
      {
        matchId: row.matchId,
        courtId: row.courtId,
        scheduledTime: row.scheduledTime,
      },
    ];
  });
}

export async function assertNoCourtScheduleConflict(input: {
  tournamentId: string;
  matchId: string;
  courtId: string | null;
  scheduledTime: Date | null;
}): Promise<{ error: string } | null> {
  if (!input.courtId || !input.scheduledTime) return null;
  const occupants = await loadTournamentCourtOccupancy(input.tournamentId);
  const conflict = findCourtScheduleConflict(
    occupants,
    input.matchId,
    input.courtId,
    input.scheduledTime
  );
  if (!conflict) return null;
  return {
    error: "Another match is already scheduled on this court at that time.",
  };
}
