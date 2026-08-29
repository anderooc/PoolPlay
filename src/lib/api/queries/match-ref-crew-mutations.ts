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

import { and, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { matchRefCrew, matches, teamMembers, tournaments, users } from "@/lib/db/schema";
import { getMatchTournamentId } from "@/lib/tournaments/match-query";
import {
  canClaimRefCrewSlot,
  canHostOverrideMatchScoring,
  isRefTeamMember,
} from "@/lib/tournaments/match-control-permissions";
import {
  buildMatchRefCrewState,
  isScorekeeperRole,
  type MatchRefCrewRole,
} from "@/lib/tournaments/match-ref-crew";
import type { MatchRefCrewState } from "@/lib/tournaments/match-ref-crew";
import { badRequest, forbidden, notFound } from "../errors";

async function loadUserTeamIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));
  return new Set(rows.map((row) => row.teamId));
}

async function loadMatchContext(matchId: string, user: AppUser) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw notFound("Match not found.");

  const tournamentId = await getMatchTournamentId(matchId);
  if (!tournamentId) throw notFound("Match not found.");

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament) throw notFound("Tournament not found.");

  const userTeamIds = await loadUserTeamIds(user.id);
  return { match, tournament, userTeamIds };
}

export async function loadMatchRefCrewStateForViewer(
  matchId: string,
  user: AppUser
): Promise<MatchRefCrewState> {
  const { match } = await loadMatchContext(matchId, user);

  const assignmentRows = await db
    .select({
      role: matchRefCrew.role,
      userId: matchRefCrew.userId,
      fullName: users.fullName,
      claimedAt: matchRefCrew.claimedAt,
    })
    .from(matchRefCrew)
    .innerJoin(users, eq(users.id, matchRefCrew.userId))
    .where(eq(matchRefCrew.matchId, matchId));

  let pointKeeperFullName: string | null = null;
  if (match.pointKeeperUserId) {
    const [keeper] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, match.pointKeeperUserId))
      .limit(1);
    pointKeeperFullName = keeper?.fullName ?? null;
  }

  return buildMatchRefCrewState({
    assignments: assignmentRows.map((row) => ({
      role: row.role as MatchRefCrewRole,
      userId: row.userId,
      fullName: row.fullName,
      claimedAt: row.claimedAt,
    })),
    pointKeeperUserId: match.pointKeeperUserId,
    pointKeeperFullName,
    viewerUserId: user.id,
  });
}

export async function claimRefCrewSlotForViewer(
  matchId: string,
  role: MatchRefCrewRole,
  user: AppUser
): Promise<MatchRefCrewState> {
  const { match, tournament, userTeamIds } = await loadMatchContext(
    matchId,
    user
  );

  if (!canClaimRefCrewSlot(tournament, match, userTeamIds)) {
    throw forbidden("Only members of the assigned ref team can claim crew slots.");
  }

  const [existingUserSlot] = await db
    .select({ id: matchRefCrew.id })
    .from(matchRefCrew)
    .where(
      and(eq(matchRefCrew.matchId, matchId), eq(matchRefCrew.userId, user.id))
    )
    .limit(1);
  if (existingUserSlot) {
    throw badRequest("Release your current slot before claiming another.");
  }

  const [existingRole] = await db
    .select({ id: matchRefCrew.id })
    .from(matchRefCrew)
    .where(and(eq(matchRefCrew.matchId, matchId), eq(matchRefCrew.role, role)))
    .limit(1);
  if (existingRole) {
    throw badRequest("That crew slot is already taken.");
  }

  await db.insert(matchRefCrew).values({
    matchId,
    userId: user.id,
    role,
  });

  return loadMatchRefCrewStateForViewer(matchId, user);
}

export async function releaseRefCrewSlotForViewer(
  matchId: string,
  user: AppUser
): Promise<MatchRefCrewState> {
  const { match, tournament, userTeamIds } = await loadMatchContext(
    matchId,
    user
  );

  const isHost = await canHostOverrideMatchScoring(tournament, user);
  const isRef = isRefTeamMember(match, userTeamIds);

  const [slot] = await db
    .select()
    .from(matchRefCrew)
    .where(
      and(eq(matchRefCrew.matchId, matchId), eq(matchRefCrew.userId, user.id))
    )
    .limit(1);

  if (!slot && !isHost) {
    throw badRequest("You do not have a crew slot on this match.");
  }

  if (slot) {
    await db.delete(matchRefCrew).where(eq(matchRefCrew.id, slot.id));
    if (match.pointKeeperUserId === user.id) {
      await db
        .update(matches)
        .set({ pointKeeperUserId: null, updatedAt: new Date() })
        .where(eq(matches.id, matchId));
    }
  }

  return loadMatchRefCrewStateForViewer(matchId, user);
}

export async function claimPointKeeperForViewer(
  matchId: string,
  user: AppUser
): Promise<MatchRefCrewState> {
  const { match, tournament, userTeamIds } = await loadMatchContext(
    matchId,
    user
  );

  if (!canClaimRefCrewSlot(tournament, match, userTeamIds)) {
    throw forbidden(
      "Only members of the assigned ref team can become the point keeper."
    );
  }

  const [slot] = await db
    .select({ role: matchRefCrew.role })
    .from(matchRefCrew)
    .where(
      and(eq(matchRefCrew.matchId, matchId), eq(matchRefCrew.userId, user.id))
    )
    .limit(1);

  if (!slot || !isScorekeeperRole(slot.role as MatchRefCrewRole)) {
    throw badRequest("Claim a scorekeeper slot before keeping points.");
  }

  await db
    .update(matches)
    .set({ pointKeeperUserId: user.id, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  return loadMatchRefCrewStateForViewer(matchId, user);
}

export async function releasePointKeeperForViewer(
  matchId: string,
  user: AppUser
): Promise<MatchRefCrewState> {
  const { match, tournament } = await loadMatchContext(matchId, user);
  const isHost = await canHostOverrideMatchScoring(tournament, user);

  if (match.pointKeeperUserId !== user.id && !isHost) {
    throw forbidden("Only the active point keeper or host can release point keeping.");
  }

  await db
    .update(matches)
    .set({ pointKeeperUserId: null, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  return loadMatchRefCrewStateForViewer(matchId, user);
}
