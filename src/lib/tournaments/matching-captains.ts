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

import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  registrations,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import type { CaptainEmailRecipient, CaptainRecipientResult } from "@/lib/tournaments/email-recipients";
import { uniqueRegions } from "@/lib/tournaments/posting-announcement-copy";
import type { TeamGender, TeamRegion } from "@/types";

const ACTIVE_REGISTRATION_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
] as const;

export async function resolveMatchingCaptainRecipients(input: {
  tournamentId: string;
  gender: TeamGender;
  regions: TeamRegion[];
  excludeUserId?: string | null;
}): Promise<CaptainRecipientResult> {
  const regions = uniqueRegions(input.regions);
  if (regions.length === 0) {
    return {
      recipients: [],
      skippedNoCaptainCount: 0,
      skippedNoCaptainTeamNames: [],
    };
  }

  const registeredRows = await db
    .select({ teamId: registrations.teamId })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, input.tournamentId),
        inArray(registrations.status, [...ACTIVE_REGISTRATION_STATUSES])
      )
    );
  const registeredTeamIds = registeredRows.map((row) => row.teamId);

  const teamFilters = [
    eq(teams.gender, input.gender),
    inArray(teams.region, regions),
  ];
  if (registeredTeamIds.length > 0) {
    teamFilters.push(notInArray(teams.id, registeredTeamIds));
  }

  const matchingTeams = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      teamUniversity: teams.university,
    })
    .from(teams)
    .where(and(...teamFilters));

  if (matchingTeams.length === 0) {
    return {
      recipients: [],
      skippedNoCaptainCount: 0,
      skippedNoCaptainTeamNames: [],
    };
  }

  const teamIds = matchingTeams.map((row) => row.teamId);
  const captainRows = await db
    .select({
      teamId: teamMembers.teamId,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(
      and(
        inArray(teamMembers.teamId, teamIds),
        eq(teamMembers.role, "captain"),
        isNull(users.disabledAt)
      )
    );

  const captainsByTeam = new Map<string, (typeof captainRows)[number][]>();
  for (const row of captainRows) {
    if (input.excludeUserId && row.userId === input.excludeUserId) continue;
    const list = captainsByTeam.get(row.teamId) ?? [];
    list.push(row);
    captainsByTeam.set(row.teamId, list);
  }

  const skippedNoCaptainTeamNames: string[] = [];
  const recipientMap = new Map<string, CaptainEmailRecipient>();

  for (const team of matchingTeams) {
    const captains = captainsByTeam.get(team.teamId) ?? [];
    if (captains.length === 0) {
      skippedNoCaptainTeamNames.push(team.teamName);
      continue;
    }

    for (const captain of captains) {
      const existing = recipientMap.get(captain.userId);
      if (existing) {
        if (!existing.teamIds.includes(team.teamId)) {
          existing.teamIds.push(team.teamId);
          existing.teamNames.push(team.teamName);
          existing.teamUniversities.push(team.teamUniversity);
        }
        continue;
      }

      recipientMap.set(captain.userId, {
        userId: captain.userId,
        email: captain.email,
        fullName: captain.fullName,
        teamIds: [team.teamId],
        teamNames: [team.teamName],
        teamUniversities: [team.teamUniversity],
      });
    }
  }

  return {
    recipients: [...recipientMap.values()].sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    ),
    skippedNoCaptainCount: skippedNoCaptainTeamNames.length,
    skippedNoCaptainTeamNames,
  };
}
