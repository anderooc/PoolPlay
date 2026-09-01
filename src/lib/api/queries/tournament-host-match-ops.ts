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

import "server-only";

import { and, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courts, matches, poolTeams } from "@/lib/db/schema";
import { assignBracketRefsForBracket } from "@/lib/tournaments/bracket-structure";
import {
  eligibleBracketRefIds,
  type BracketMatchForRefs,
} from "@/lib/tournaments/bracket-refs";
import { assertNoCourtScheduleConflict } from "@/lib/tournaments/court-schedule";
import { getMatchTournamentId } from "@/lib/tournaments/match-query";
import { resolveIsTournamentOrganizer } from "@/lib/tournaments/permissions";
import type { TournamentHostSettingsMutationResultContract } from "../contracts/tournament-host";
import { badRequest, forbidden, notFound } from "../errors";
import { requirePostedTournament } from "./tournament-ops";

async function requireOrganizerTournament(slug: string, user: AppUser) {
  const tournament = await requirePostedTournament(slug);
  if (!(await resolveIsTournamentOrganizer(tournament, user))) {
    throw forbidden("Only the organizer can manage match assignments.");
  }
  return tournament;
}

async function requireTournamentMatch(
  slug: string,
  user: AppUser,
  matchId: string
) {
  const tournament = await requireOrganizerTournament(slug, user);
  const matchTournamentId = await getMatchTournamentId(matchId);
  if (!matchTournamentId || matchTournamentId !== tournament.id) {
    throw notFound("Match not found.");
  }
  return tournament;
}

export async function updateTournamentHostMatchRef(
  slug: string,
  user: AppUser,
  matchId: string,
  refTeamId: string | null
): Promise<TournamentHostSettingsMutationResultContract> {
  await requireTournamentMatch(slug, user, matchId);

  const [match] = await db
    .select({
      id: matches.id,
      poolId: matches.poolId,
      bracketId: matches.bracketId,
      bracketRound: matches.bracketRound,
      bracketPosition: matches.bracketPosition,
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
      status: matches.status,
      courtId: matches.courtId,
      scheduledTime: matches.scheduledTime,
      winnerId: matches.winnerId,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match || (!match.poolId && !match.bracketId)) {
    throw notFound("Match not found.");
  }

  if (match.status === "completed") {
    throw badRequest("Match is already completed.");
  }

  if (
    refTeamId !== null &&
    (refTeamId === match.teamAId || refTeamId === match.teamBId)
  ) {
    throw badRequest("Working team can't be one of the playing teams.");
  }

  if (refTeamId !== null && match.poolId) {
    const [member] = await db
      .select({ teamId: poolTeams.teamId })
      .from(poolTeams)
      .where(
        and(eq(poolTeams.poolId, match.poolId), eq(poolTeams.teamId, refTeamId))
      )
      .limit(1);
    if (!member) {
      throw badRequest("Working team must be in the same pool.");
    }
  }

  if (refTeamId !== null && match.bracketId) {
    const bracketRows = await db
      .select({
        id: matches.id,
        bracketRound: matches.bracketRound,
        bracketPosition: matches.bracketPosition,
        teamAId: matches.teamAId,
        teamBId: matches.teamBId,
        winnerId: matches.winnerId,
        status: matches.status,
        courtId: matches.courtId,
        scheduledTime: matches.scheduledTime,
      })
      .from(matches)
      .where(eq(matches.bracketId, match.bracketId));

    const allForRefs: BracketMatchForRefs[] = bracketRows
      .filter((row) => row.bracketRound != null && row.bracketPosition != null)
      .map((row) => ({
        id: row.id,
        bracketRound: row.bracketRound!,
        bracketPosition: row.bracketPosition!,
        teamAId: row.teamAId,
        teamBId: row.teamBId,
        winnerId: row.winnerId,
        status: row.status,
        courtId: row.courtId,
        scheduledTime: row.scheduledTime,
      }));

    const target = allForRefs.find((row) => row.id === match.id);
    if (!target) {
      throw notFound("Match not found.");
    }

    const eligible = eligibleBracketRefIds(target, allForRefs);
    if (!eligible.includes(refTeamId)) {
      throw badRequest(
        "Ref must be a bye team, a team from a later match on the same court, or a loser from the previous round."
      );
    }
  }

  await db
    .update(matches)
    .set({ refTeamId, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  return { success: true };
}

export async function updateTournamentHostMatchCourt(
  slug: string,
  user: AppUser,
  matchId: string,
  courtId: string | null
): Promise<TournamentHostSettingsMutationResultContract> {
  const tournament = await requireTournamentMatch(slug, user, matchId);

  const [match] = await db
    .select({
      id: matches.id,
      bracketId: matches.bracketId,
      status: matches.status,
      scheduledTime: matches.scheduledTime,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match?.bracketId) {
    throw badRequest("Only bracket matches support court assignment.");
  }

  if (match.status === "completed") {
    throw badRequest("Match is already completed.");
  }

  if (courtId) {
    const [court] = await db
      .select({ id: courts.id })
      .from(courts)
      .where(and(eq(courts.id, courtId), eq(courts.tournamentId, tournament.id)))
      .limit(1);
    if (!court) {
      throw badRequest("Court not found.");
    }

    const conflict = await assertNoCourtScheduleConflict({
      tournamentId: tournament.id,
      matchId,
      courtId,
      scheduledTime: match.scheduledTime,
    });
    if (conflict) {
      throw badRequest(conflict.error);
    }
  }

  await db
    .update(matches)
    .set({ courtId, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  await assignBracketRefsForBracket(match.bracketId, db, {
    resetRoundOneCourtId: courtId,
  });

  return { success: true };
}
