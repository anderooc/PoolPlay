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

import { db } from "@/lib/db";
import {
  teamMembers,
  tournamentWaivers,
  users,
  waiverCompletions,
} from "@/lib/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { TournamentWaiverSettings } from "@/lib/tournaments/waiver-access";
import { waiverSettingsFromTournament } from "@/lib/tournaments/waiver-access";

export type WaiverCompletionMethod =
  | "digital"
  | "captain_attested"
  | "host_override";

export type WaiverRosterMemberStatus = {
  userId: string;
  fullName: string;
  role: string;
  completed: boolean;
  method: WaiverCompletionMethod | null;
  completedAt: Date | null;
};

export type TeamWaiverCompliance = {
  required: boolean;
  complete: boolean;
  completedCount: number;
  totalCount: number;
  roster: WaiverRosterMemberStatus[];
};

export async function getLatestTournamentWaiver(tournamentId: string) {
  const [row] = await db
    .select()
    .from(tournamentWaivers)
    .where(eq(tournamentWaivers.tournamentId, tournamentId))
    .orderBy(desc(tournamentWaivers.version))
    .limit(1);

  return row ?? null;
}

export async function getTeamWaiverCompliance(
  tournament: {
    id: string;
    waiverEnabled: boolean;
    waiverAllowDownloadPrint: boolean;
    waiverAllowThirdParty: boolean;
    waiverAllowDigitalAck: boolean;
    waiverThirdPartyUrl: string | null;
    waiverRequiredBeforeCheckIn: boolean;
  },
  teamId: string
): Promise<TeamWaiverCompliance> {
  const settings = waiverSettingsFromTournament(tournament);
  const waiver = await getLatestTournamentWaiver(tournament.id);

  const rosterRows = await db
    .select({
      userId: teamMembers.userId,
      role: teamMembers.role,
      fullName: users.fullName,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(asc(users.fullName));

  if (!settings.enabled || !waiver) {
    return {
      required: false,
      complete: true,
      completedCount: rosterRows.length,
      totalCount: rosterRows.length,
      roster: rosterRows.map((member) => ({
        userId: member.userId,
        fullName: member.fullName,
        role: member.role,
        completed: true,
        method: null,
        completedAt: null,
      })),
    };
  }

  const completionRows =
    rosterRows.length === 0
      ? []
      : await db
          .select({
            userId: waiverCompletions.userId,
            method: waiverCompletions.method,
            completedAt: waiverCompletions.completedAt,
          })
          .from(waiverCompletions)
          .where(
            and(
              eq(waiverCompletions.waiverId, waiver.id),
              eq(waiverCompletions.teamId, teamId),
              inArray(
                waiverCompletions.userId,
                rosterRows.map((r) => r.userId)
              )
            )
          );

  const completionByUser = new Map(
    completionRows.map((row) => [row.userId, row])
  );

  const roster: WaiverRosterMemberStatus[] = rosterRows.map((member) => {
    const completion = completionByUser.get(member.userId);
    return {
      userId: member.userId,
      fullName: member.fullName,
      role: member.role,
      completed: Boolean(completion),
      method: (completion?.method as WaiverCompletionMethod | undefined) ?? null,
      completedAt: completion?.completedAt ?? null,
    };
  });

  const completedCount = roster.filter((member) => member.completed).length;

  return {
    required: true,
    complete: completedCount === roster.length && roster.length > 0,
    completedCount,
    totalCount: roster.length,
    roster,
  };
}

export async function getTeamsWaiverSummary(
  tournament: Parameters<typeof getTeamWaiverCompliance>[0],
  teamIds: string[]
): Promise<
  Map<
    string,
    Pick<
      TeamWaiverCompliance,
      "required" | "complete" | "completedCount" | "totalCount"
    >
  >
> {
  const summary = new Map<
    string,
    Pick<
      TeamWaiverCompliance,
      "required" | "complete" | "completedCount" | "totalCount"
    >
  >();

  if (teamIds.length === 0) return summary;

  const settings = waiverSettingsFromTournament(tournament);
  const waiver = await getLatestTournamentWaiver(tournament.id);

  const rosterRows = await db
    .select({
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      fullName: users.fullName,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(inArray(teamMembers.teamId, teamIds))
    .orderBy(asc(users.fullName));

  const rosterByTeam = new Map<string, typeof rosterRows>();
  for (const row of rosterRows) {
    const list = rosterByTeam.get(row.teamId);
    if (list) list.push(row);
    else rosterByTeam.set(row.teamId, [row]);
  }

  if (!settings.enabled || !waiver) {
    for (const teamId of teamIds) {
      const roster = rosterByTeam.get(teamId) ?? [];
      summary.set(teamId, {
        required: false,
        complete: true,
        completedCount: roster.length,
        totalCount: roster.length,
      });
    }
    return summary;
  }

  const userIds = [...new Set(rosterRows.map((row) => row.userId))];
  const completionRows =
    userIds.length === 0
      ? []
      : await db
          .select({
            teamId: waiverCompletions.teamId,
            userId: waiverCompletions.userId,
          })
          .from(waiverCompletions)
          .where(
            and(
              eq(waiverCompletions.waiverId, waiver.id),
              inArray(waiverCompletions.teamId, teamIds),
              inArray(waiverCompletions.userId, userIds)
            )
          );

  const completedUsersByTeam = new Map<string, Set<string>>();
  for (const row of completionRows) {
    const set = completedUsersByTeam.get(row.teamId);
    if (set) set.add(row.userId);
    else completedUsersByTeam.set(row.teamId, new Set([row.userId]));
  }

  for (const teamId of teamIds) {
    const roster = rosterByTeam.get(teamId) ?? [];
    const completedUsers = completedUsersByTeam.get(teamId);
    const completedCount = roster.filter((member) =>
      completedUsers?.has(member.userId)
    ).length;

    summary.set(teamId, {
      required: true,
      complete: completedCount === roster.length && roster.length > 0,
      completedCount,
      totalCount: roster.length,
    });
  }

  return summary;
}

export function waiverBlocksCheckIn(
  settings: TournamentWaiverSettings,
  compliance: Pick<TeamWaiverCompliance, "required" | "complete">
): boolean {
  return (
    settings.enabled &&
    settings.requiredBeforeCheckIn &&
    compliance.required &&
    !compliance.complete
  );
}
