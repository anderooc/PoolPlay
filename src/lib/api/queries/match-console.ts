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

import { asc, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  brackets,
  courts,
  divisions,
  matches,
  pools,
  sets,
  teamMembers,
  teams,
} from "@/lib/db/schema";
import { getTournamentBySlugIfVisible } from "@/lib/tournaments/access";
import {
  buildMatchScoreState,
  matchPhase,
  setStartingScoreForMatch,
} from "@/lib/tournaments/match-format";
import { resolveMatchInTournament } from "@/lib/tournaments/match-query";
import {
  canClaimRefCrewSlot,
  canEditMatchScores,
  canRunMatchLifecycle,
  isRefTeamMember,
} from "@/lib/tournaments/match-control-permissions";
import {
  canViewDivisionPoolPlay,
  resolveIsTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import { getMatchDivisionIdMap } from "@/lib/tournaments/unreleased-divisions";
import {
  byeWinnerId,
  isBracketRoundOneByeMatch,
} from "@/lib/utils/bracket";
import type { MatchConsoleContract } from "../contracts/match-console";
import { notFound } from "../errors";
import { asMatchStatus } from "./tournament-detail";
import { loadMatchRefCrewStateForViewer } from "./match-ref-crew-mutations";

async function loadTeam(teamId: string | null) {
  if (!teamId) return null;
  const [row] = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  return row ?? null;
}

export async function loadMatchConsoleForViewer(
  tournamentSlug: string,
  matchSlug: string,
  user: AppUser
): Promise<MatchConsoleContract> {
  const tournament = await getTournamentBySlugIfVisible(tournamentSlug, user);
  if (!tournament) throw notFound("Tournament not found.");

  const match = await resolveMatchInTournament(tournament.id, matchSlug);
  if (!match) throw notFound("Match not found.");

  const divisionByMatch = await getMatchDivisionIdMap(tournament.id);
  const divisionId = divisionByMatch.get(match.id);
  if (divisionId) {
    const [division] = await db
      .select({ poolsReleasedAt: divisions.poolsReleasedAt })
      .from(divisions)
      .where(eq(divisions.id, divisionId))
      .limit(1);
    if (
      !(await canViewDivisionPoolPlay(
        tournament,
        user,
        division?.poolsReleasedAt ?? null
      ))
    ) {
      throw notFound("Match not found.");
    }
  }

  const [teamA, teamB, refTeam, courtRow, matchSets, memberRows, divisionRow] =
    await Promise.all([
      loadTeam(match.teamAId),
      loadTeam(match.teamBId),
      loadTeam(match.refTeamId),
      match.courtId
        ? db
            .select({ name: courts.name })
            .from(courts)
            .where(eq(courts.id, match.courtId))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({
          setNumber: sets.setNumber,
          teamAScore: sets.teamAScore,
          teamBScore: sets.teamBScore,
        })
        .from(sets)
        .where(eq(sets.matchId, match.id))
        .orderBy(asc(sets.setNumber)),
      db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, user.id)),
      divisionId
        ? db
            .select({ name: divisions.name })
            .from(divisions)
            .where(eq(divisions.id, divisionId))
            .limit(1)
        : match.bracketId
          ? db
              .select({ name: divisions.name })
              .from(brackets)
              .innerJoin(divisions, eq(divisions.id, brackets.divisionId))
              .where(eq(brackets.id, match.bracketId))
              .limit(1)
          : Promise.resolve([]),
    ]);

  const userTeamIds = new Set(memberRows.map((row) => row.teamId));
  const isOrganizer = await resolveIsTournamentOrganizer(tournament, user);
  const isRefMember = isRefTeamMember(match, userTeamIds);
  const canScore = await canEditMatchScores(tournament, user, match);
  const canRunLifecycle = await canRunMatchLifecycle(tournament, user, match);
  const canClaimCrewSlot = canClaimRefCrewSlot(tournament, match, userTeamIds);
  const crew = await loadMatchRefCrewStateForViewer(match.id, user);
  const canBecomePointKeeper =
    canClaimCrewSlot &&
    crew.viewerSlot != null &&
    ["scorekeeper_1", "scorekeeper_2", "scorekeeper_3"].includes(
      crew.viewerSlot
    ) &&
    !crew.viewerIsPointKeeper;

  const startingScore = setStartingScoreForMatch(tournament, match);
  const scoreState = buildMatchScoreState(
    {
      format: tournament.matchFormat,
      targetScore: tournament.setTargetScore,
      tiebreakTargetScore: tournament.tiebreakTargetScore,
    },
    matchSets
  );

  const isBye = isBracketRoundOneByeMatch(match);
  const winnerId = match.winnerId ?? (isBye ? byeWinnerId(match) : null);
  const winnerTeam =
    winnerId === match.teamAId
      ? teamA
      : winnerId === match.teamBId
        ? teamB
        : null;

  return {
    tournamentSlug: tournament.slug,
    tournamentName: tournament.name,
    matchSlug: match.slug,
    status: asMatchStatus(match.status),
    derivedPhase: matchPhase(match),
    scheduledTime: match.scheduledTime?.toISOString() ?? null,
    warmupStartedAt: match.warmupStartedAt?.toISOString() ?? null,
    startedAt: match.startedAt?.toISOString() ?? null,
    courtName: courtRow[0]?.name ?? null,
    divisionName: divisionRow[0]?.name ?? null,
    refTeamName: refTeam?.name ?? null,
    phase: match.poolId ? "pool" : "bracket",
    isBye,
    teamA: teamA
      ? { id: teamA.id, slug: teamA.slug, name: teamA.name }
      : null,
    teamB: teamB
      ? { id: teamB.id, slug: teamB.slug, name: teamB.name }
      : null,
    winnerSlug: winnerTeam?.slug ?? null,
    sets: matchSets,
    settings: {
      matchFormat: tournament.matchFormat,
      setStartingScore: startingScore,
      setTargetScore: tournament.setTargetScore,
      tiebreakTargetScore: tournament.tiebreakTargetScore,
      warmupFormat: tournament.warmupFormat,
    },
    scoreState,
    crew,
    permissions: {
      canScore,
      canRunLifecycle,
      canClaimCrewSlot,
      canBecomePointKeeper,
      isOrganizer,
      isRefMember,
      canControl: canScore || canRunLifecycle,
    },
  };
}

export async function resolveMatchIdForViewer(
  tournamentSlug: string,
  matchSlug: string,
  user: AppUser
): Promise<string> {
  const tournament = await getTournamentBySlugIfVisible(tournamentSlug, user);
  if (!tournament) throw notFound("Tournament not found.");
  const match = await resolveMatchInTournament(tournament.id, matchSlug);
  if (!match) throw notFound("Match not found.");
  return match.id;
}
