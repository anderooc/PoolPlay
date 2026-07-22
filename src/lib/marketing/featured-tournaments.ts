/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { db } from "@/lib/db";
import { registrations, tournaments } from "@/lib/db/schema";
import { and, asc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { todayISO } from "@/lib/tournament-status";
import { enrichTournamentsWithHostSchools } from "@/lib/tournaments/host-school";
import {
  tournamentListColumns,
  type TournamentListItem,
} from "@/lib/tournaments/list-columns";
import type { TournamentHostSchool } from "@/lib/tournaments/host-school";

export type FeaturedTournament = TournamentListItem & {
  hostSchool: TournamentHostSchool | null;
  teamCount: number;
};

const ACTIVE_REGISTRATION_STATUSES = ["confirmed", "checked_in"] as const;

export async function getFeaturedTournaments(
  limit = 6
): Promise<FeaturedTournament[]> {
  const today = todayISO();

  const rows = await db
    .select(tournamentListColumns)
    .from(tournaments)
    .where(
      and(
        ne(tournaments.status, "draft"),
        or(
          gte(tournaments.date, today),
          eq(tournaments.status, "in_progress")
        )
      )
    )
    .orderBy(asc(tournaments.date))
    .limit(limit);

  if (rows.length === 0) return [];

  const enriched = await enrichTournamentsWithHostSchools(rows);
  const ids = enriched.map((tournament) => tournament.id);

  const teamCounts = await db
    .select({
      tournamentId: registrations.tournamentId,
      teamCount: sql<number>`count(*)::int`,
    })
    .from(registrations)
    .where(
      and(
        inArray(registrations.tournamentId, ids),
        inArray(registrations.status, [...ACTIVE_REGISTRATION_STATUSES])
      )
    )
    .groupBy(registrations.tournamentId);

  const countByTournamentId = new Map(
    teamCounts.map((row) => [row.tournamentId, row.teamCount])
  );

  return enriched.map((tournament) => ({
    ...tournament,
    teamCount: countByTournamentId.get(tournament.id) ?? 0,
  }));
}
