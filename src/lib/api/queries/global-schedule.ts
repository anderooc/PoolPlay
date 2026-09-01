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

import { asc, eq, isNotNull } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import type {
  GlobalScheduleContract,
  GlobalScheduleMatchContract,
} from "@/lib/api/contracts/global-schedule";
import { db } from "@/lib/db";
import { matches, tournaments } from "@/lib/db/schema";
import { enrichScheduledMatches } from "@/lib/schedule/enrich-scheduled-matches";
import type { MatchStatus } from "@/types";

const DEFAULT_LIMIT = 200;

function asMatchStatus(status: string): MatchStatus {
  if (
    status === "upcoming" ||
    status === "in_progress" ||
    status === "completed"
  ) {
    return status;
  }
  throw new Error(`Unexpected match status: ${status}`);
}

export async function loadGlobalScheduleForViewer(
  user: AppUser,
  options?: { limit?: number }
): Promise<GlobalScheduleContract> {
  const limit = options?.limit ?? DEFAULT_LIMIT;

  const [matchRows, organizerTournamentRows] = await Promise.all([
    db
      .select({
        match: matches,
        tournamentSlug: tournaments.slug,
        tournamentName: tournaments.name,
      })
      .from(matches)
      .innerJoin(tournaments, eq(tournaments.id, matches.tournamentId))
      .where(isNotNull(matches.scheduledTime))
      .orderBy(asc(matches.scheduledTime))
      .limit(limit),
    db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        slug: tournaments.slug,
      })
      .from(tournaments)
      .where(eq(tournaments.organizerId, user.id)),
  ]);

  const enriched = await enrichScheduledMatches(matchRows.map((row) => row.match));
  const tournamentByMatchId = new Map(
    matchRows.map((row) => [
      row.match.id,
      { slug: row.tournamentSlug, name: row.tournamentName },
    ])
  );

  const contractMatches: GlobalScheduleMatchContract[] = enriched.map(
    (match) => {
      const tournament = tournamentByMatchId.get(match.id);
      if (!tournament) {
        throw new Error(`Missing tournament metadata for match ${match.id}`);
      }

      return {
        id: match.id,
        matchSlug: match.slug,
        tournamentSlug: tournament.slug,
        tournamentName: tournament.name,
        status: asMatchStatus(match.status),
        scheduledTime: match.scheduledTime!.toISOString(),
        warmupStart: match.warmupStart?.toISOString() ?? null,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        courtName: match.courtName,
        refTeamName: match.refTeamName,
        contextLabel: match.contextLabel,
        gender: match.gender,
        region: match.region,
      };
    }
  );

  return {
    matches: contractMatches,
    organizerTournaments: organizerTournamentRows,
  };
}
