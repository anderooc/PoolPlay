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

import { getDivisionPlayData } from "@/app/(dashboard)/tournaments/[slug]/brackets/data";
import type { DivisionPlayData } from "@/app/(dashboard)/tournaments/[slug]/brackets/data";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courts, matches } from "@/lib/db/schema";
import { assignBracketRefsForBracket } from "@/lib/tournaments/bracket-structure";
import {
  eligibleBracketRefIds,
  type BracketMatchForRefs,
} from "@/lib/tournaments/bracket-refs";
import { assertNoCourtScheduleConflict } from "@/lib/tournaments/court-schedule";
import { loadTournamentCourtOccupancy } from "@/lib/tournaments/court-schedule";
import { getMatchTournamentId } from "@/lib/tournaments/match-query";
import {
  canScheduleMatches,
  resolveIsTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import { isTournamentArchived } from "@/lib/tournament-status";
import {
  clampMatchIntervalMinutes,
  fillableCount,
  matchupLabel,
  proposeMatchTimeFill,
  type ScheduleTimesScope,
} from "@/lib/utils/match-time-fill";
import {
  scheduleGroupsFromPlayData,
} from "@/lib/utils/schedule-times-groups";
import { eq, inArray } from "drizzle-orm";
import type {
  TournamentHostScheduleContract,
  TournamentHostScheduleFillPreviewContract,
  TournamentHostScheduleFillResultContract,
  TournamentHostScheduleResultContract,
  TournamentHostScheduleScopeContract,
} from "../contracts/tournament-host";
import { badRequest, forbidden, notFound } from "../errors";
import { requireHostTournament } from "./tournament-host";
import {
  applyHostScheduleFillForTournament,
  loadHostScheduleFillMatches,
} from "./tournament-host-schedule-fill";

function isoFromClockMinutes(tournamentDate: string, minutes: number): string {
  const [year, month, day] = tournamentDate.split("-").map(Number);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Date(Date.UTC(year, month - 1, day, hours, mins, 0, 0)).toISOString();
}

export function parseClockOnTournamentDate(
  tournamentDate: string,
  clock: string
): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return isoFromClockMinutes(tournamentDate, hours * 60 + mins);
}

function asScope(
  scope: ScheduleTimesScope
): TournamentHostScheduleScopeContract {
  return scope;
}

function previewNote(
  row: ReturnType<typeof proposeMatchTimeFill>[number]
): string | null {
  if (row.kind === "locked") return "Completed or in progress, skipped";
  if (row.courtConflict) return "Court already booked at this time";
  if (row.kind === "keep" && row.currentIso) {
    return `Keeping ${new Date(row.currentIso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return null;
}

function buildMatchAssignmentMeta(divisions: DivisionPlayData[]) {
  const meta = new Map<
    string,
    {
      refTeamId: string | null;
      refTeamName: string | null;
      canAssignCourt: boolean;
      refOptions: { id: string; name: string }[];
    }
  >();

  for (const division of divisions) {
    for (const pool of division.pools) {
      const poolTeamOptions = pool.teams.map((team) => ({
        id: team.id,
        name: team.name,
      }));
      for (const match of pool.matches) {
        meta.set(match.id, {
          refTeamId: match.refTeamId,
          refTeamName: match.ref?.name ?? null,
          canAssignCourt: false,
          refOptions: poolTeamOptions.filter(
            (team) => team.id !== match.teamAId && team.id !== match.teamBId
          ),
        });
      }
    }

    for (const bracket of division.brackets) {
      const teamNameById = new Map<string, string>();
      for (const match of bracket.matches) {
        if (match.teamA) teamNameById.set(match.teamA.id, match.teamA.name);
        if (match.teamB) teamNameById.set(match.teamB.id, match.teamB.name);
        if (match.ref) teamNameById.set(match.ref.id, match.ref.name);
      }

      const forRefs: BracketMatchForRefs[] = bracket.matches
        .filter(
          (match) => match.bracketRound != null && match.bracketPosition != null
        )
        .map((match) => ({
          id: match.id,
          bracketRound: match.bracketRound!,
          bracketPosition: match.bracketPosition!,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          winnerId: match.winnerId,
          status: match.status,
          courtId: match.courtId,
          scheduledTime: match.scheduledTime,
        }));

      for (const match of bracket.matches) {
        const target = forRefs.find((row) => row.id === match.id);
        const eligibleIds = target
          ? eligibleBracketRefIds(target, forRefs)
          : [];
        meta.set(match.id, {
          refTeamId: match.refTeamId,
          refTeamName: match.ref?.name ?? null,
          canAssignCourt: true,
          refOptions: eligibleIds.map((id) => ({
            id,
            name: teamNameById.get(id) ?? "Team",
          })),
        });
      }
    }
  }

  return meta;
}

async function buildScheduleContract(
  tournament: Awaited<ReturnType<typeof requireHostTournament>>,
  user: AppUser
): Promise<TournamentHostScheduleContract> {
  const [divisionPlayData, courtRows, canSchedule] = await Promise.all([
    getDivisionPlayData(tournament.id, { forOrganizer: true }),
    db
      .select({ id: courts.id, name: courts.name })
      .from(courts)
      .where(eq(courts.tournamentId, tournament.id)),
    canScheduleMatches(tournament, user),
  ]);

  const groups = scheduleGroupsFromPlayData(divisionPlayData, "all");
  const matchIds = groups.flatMap((group) =>
    group.matches.map((match) => match.id)
  );
  const slugRows =
    matchIds.length === 0
      ? []
      : await db
          .select({ id: matches.id, slug: matches.slug })
          .from(matches)
          .where(inArray(matches.id, matchIds));
  const slugById = new Map(slugRows.map((row) => [row.id, row.slug]));
  const courtNameById = new Map(courtRows.map((row) => [row.id, row.name]));
  const assignmentMeta = buildMatchAssignmentMeta(divisionPlayData);

  return {
    date: tournament.date,
    canSchedule,
    courts: courtRows,
    groups: groups.map((group) => {
      const playable = group.matches.filter((match) => !match.isBye);
      return {
        id: group.id,
        label: group.label,
        scope: asScope(group.scope),
        scheduledCount: playable.filter((match) => match.scheduledTime).length,
        totalCount: playable.length,
        matches: group.matches.map((match) => {
          const assignment = assignmentMeta.get(match.id);
          return {
            id: match.id,
            slug: slugById.get(match.id) ?? match.id,
            groupName: match.groupName,
            status: match.status,
            scheduledTime: match.scheduledTime,
            courtId: match.courtId,
            courtName: match.courtId
              ? (courtNameById.get(match.courtId) ?? null)
              : null,
            teamAName: match.teamAName,
            teamBName: match.teamBName,
            label: matchupLabel(match.teamAName, match.teamBName),
            isBye: match.isBye,
            refTeamId: assignment?.refTeamId ?? null,
            refTeamName: assignment?.refTeamName ?? null,
            canAssignCourt: assignment?.canAssignCourt ?? false,
            refOptions: assignment?.refOptions ?? [],
          };
        }),
      };
    }),
  };
}

async function scheduleResult(
  slug: string,
  user: AppUser
): Promise<TournamentHostScheduleResultContract> {
  const tournament = await requireHostTournament(slug, user);
  return {
    success: true,
    schedule: await buildScheduleContract(tournament, user),
  };
}

export async function loadTournamentHostSchedule(
  slug: string,
  user: AppUser
): Promise<TournamentHostScheduleResultContract> {
  return scheduleResult(slug, user);
}

export async function updateTournamentHostMatchSchedule(
  slug: string,
  user: AppUser,
  matchId: string,
  scheduledTime: string | null
): Promise<TournamentHostScheduleResultContract> {
  const tournament = await requireHostTournament(slug, user);
  if (!(await resolveIsTournamentOrganizer(tournament, user))) {
    throw forbidden("Only the host can edit the start time.");
  }
  if (isTournamentArchived(tournament.date)) {
    throw badRequest("This tournament is archived.");
  }

  const matchTournamentId = await getMatchTournamentId(matchId);
  if (!matchTournamentId || matchTournamentId !== tournament.id) {
    throw notFound("Match not found.");
  }

  let parsedTime: Date | null = null;
  if (scheduledTime) {
    parsedTime = new Date(scheduledTime);
    if (Number.isNaN(parsedTime.getTime())) {
      throw badRequest("Enter a valid start time.");
    }
  }

  const [match] = await db
    .select({
      bracketId: matches.bracketId,
      courtId: matches.courtId,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (parsedTime) {
    const conflict = await assertNoCourtScheduleConflict({
      tournamentId: tournament.id,
      matchId,
      courtId: match?.courtId ?? null,
      scheduledTime: parsedTime,
    });
    if (conflict) throw badRequest(conflict.error ?? "Court schedule conflict.");
  }

  await db
    .update(matches)
    .set({ scheduledTime: parsedTime, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  if (match?.bracketId) {
    await assignBracketRefsForBracket(match.bracketId, db, {
      resetRoundOneCourtId: match.courtId,
    });
  }

  return scheduleResult(slug, user);
}

export async function previewTournamentHostScheduleFill(
  slug: string,
  user: AppUser,
  scope: TournamentHostScheduleScopeContract,
  firstStartIso: string,
  intervalMinutes: number,
  overwrite: boolean
): Promise<TournamentHostScheduleFillPreviewContract> {
  const tournament = await requireHostTournament(slug, user);
  if (!(await canScheduleMatches(tournament, user))) {
    throw forbidden("Only the host can edit start times.");
  }
  if (isTournamentArchived(tournament.date)) {
    throw badRequest("This tournament is archived.");
  }

  const firstStart = new Date(firstStartIso);
  if (Number.isNaN(firstStart.getTime())) {
    throw badRequest("Enter a valid first start time.");
  }

  const loaded = await loadHostScheduleFillMatches(
    tournament.id,
    scope as ScheduleTimesScope
  );
  if ("error" in loaded) {
    throw badRequest(loaded.error ?? "Could not load matches for fill.");
  }

  const occupancy = await loadTournamentCourtOccupancy(tournament.id);
  const groupIds = new Set(loaded.matches.map((match) => match.id));
  const externalOccupancy = occupancy.filter(
    (occupant) => !groupIds.has(occupant.matchId)
  );

  const rows = proposeMatchTimeFill({
    matches: loaded.matches,
    firstStart,
    intervalMinutes: clampMatchIntervalMinutes(intervalMinutes),
    overwrite,
    externalOccupancy,
  });

  return {
    success: true,
    applyCount: fillableCount(rows),
    rows: rows.map((row) => ({
      matchId: row.matchId,
      label: row.label,
      groupName: row.groupName,
      proposedTime: row.proposedIso,
      kind: row.kind,
      note: previewNote(row),
    })),
  };
}

export async function applyTournamentHostScheduleFill(
  slug: string,
  user: AppUser,
  scope: TournamentHostScheduleScopeContract,
  firstStartIso: string,
  intervalMinutes: number,
  overwrite: boolean
): Promise<TournamentHostScheduleFillResultContract> {
  const tournament = await requireHostTournament(slug, user);
  const result = await applyHostScheduleFillForTournament({
    tournamentId: tournament.id,
    user,
    scope: scope as ScheduleTimesScope,
    firstStartIso,
    intervalMinutes,
    overwrite,
  });
  if ("error" in result) {
    throw badRequest(result.error ?? "Could not apply schedule fill.");
  }

  return {
    success: true,
    updated: result.updated,
    schedule: await buildScheduleContract(tournament, user),
  };
}
