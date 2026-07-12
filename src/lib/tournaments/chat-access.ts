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
  registrations,
  schoolMembers,
  teamMembers,
  teams,
  tournamentChatChannels,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { isSchoolOfficerOrAbove } from "@/lib/schools/permissions";
import { isTournamentArchived } from "@/lib/tournament-status";
import {
  isTournamentOrganizer,
  type TournamentForPermissions,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";
import type { TournamentChatChannelKind } from "@/types";

export const CHAT_REGISTRATION_STATUSES = ["confirmed", "checked_in"] as const;

export const TOURNAMENT_CHAT_CHANNEL_KINDS: TournamentChatChannelKind[] = [
  "announcements",
  "questions",
  "general",
];

export const TOURNAMENT_CHAT_CHANNEL_LABELS: Record<
  TournamentChatChannelKind,
  string
> = {
  announcements: "Announcements",
  questions: "Questions",
  general: "General",
};

export const TOURNAMENT_CHAT_CHANNEL_DESCRIPTIONS: Record<
  TournamentChatChannelKind,
  string
> = {
  announcements: "Updates from the tournament host. Read-only for teams.",
  questions: "Ask the host about parking, check-in, schedule, and logistics.",
  general: "Open discussion between registered teams.",
};

export type EligibleSpeakingTeam = {
  teamId: string;
  teamName: string;
};

export async function userCanViewTournamentChat(
  tournament: TournamentForPermissions & { id: string },
  user: UserForPermissions,
  userTeamIds: Iterable<string>
): Promise<boolean> {
  if (isTournamentOrganizer(tournament, user) || isAdmin(user)) return true;

  const teamIds =
    userTeamIds instanceof Set ? [...userTeamIds] : [...userTeamIds];
  if (teamIds.length === 0) return false;

  const [row] = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.teamId, teamIds),
        inArray(registrations.status, [...CHAT_REGISTRATION_STATUSES])
      )
    )
    .limit(1);

  return Boolean(row);
}

export async function getUserEligibleSpeakingTeams(
  tournamentId: string,
  userId: string
): Promise<EligibleSpeakingTeam[]> {
  const registrationRows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      schoolId: teams.schoolId,
    })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        inArray(registrations.status, [...CHAT_REGISTRATION_STATUSES])
      )
    );

  if (registrationRows.length === 0) return [];

  const teamIds = registrationRows.map((row) => row.teamId);
  const captainRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, "captain"),
        inArray(teamMembers.teamId, teamIds)
      )
    );
  const captainTeamIds = new Set(captainRows.map((row) => row.teamId));

  const schoolIds = [
    ...new Set(
      registrationRows
        .map((row) => row.schoolId)
        .filter((id): id is string => id != null)
    ),
  ];

  const officerSchoolIds = new Set<string>();
  if (schoolIds.length > 0) {
    const officerRows = await db
      .select({ schoolId: schoolMembers.schoolId, role: schoolMembers.role })
      .from(schoolMembers)
      .where(
        and(
          eq(schoolMembers.userId, userId),
          inArray(schoolMembers.schoolId, schoolIds)
        )
      );
    for (const row of officerRows) {
      if (
        isSchoolOfficerOrAbove({
          schoolId: row.schoolId,
          userId,
          role: row.role,
        })
      ) {
        officerSchoolIds.add(row.schoolId);
      }
    }
  }

  const eligible = new Map<string, EligibleSpeakingTeam>();
  for (const row of registrationRows) {
    const isCaptain = captainTeamIds.has(row.teamId);
    const isSchoolOfficer =
      row.schoolId != null && officerSchoolIds.has(row.schoolId);
    if (isCaptain || isSchoolOfficer) {
      eligible.set(row.teamId, {
        teamId: row.teamId,
        teamName: row.teamName,
      });
    }
  }

  return [...eligible.values()].sort((a, b) =>
    a.teamName.localeCompare(b.teamName)
  );
}

export function canPostInTournamentChat(
  tournament: Pick<TournamentForPermissions, "date" | "status">
): boolean {
  return !isTournamentArchived(tournament.date);
}

export function canPostInChatChannel(
  kind: TournamentChatChannelKind,
  isOrganizer: boolean,
  hasEligibleTeam: boolean
): boolean {
  if (!isOrganizer && !hasEligibleTeam) return false;
  if (kind === "announcements") return isOrganizer;
  return isOrganizer || hasEligibleTeam;
}

export async function ensureTournamentChatChannels(tournamentId: string) {
  const existing = await db
    .select({
      id: tournamentChatChannels.id,
      kind: tournamentChatChannels.kind,
    })
    .from(tournamentChatChannels)
    .where(eq(tournamentChatChannels.tournamentId, tournamentId));

  const existingKinds = new Set(existing.map((row) => row.kind));
  const missingKinds = TOURNAMENT_CHAT_CHANNEL_KINDS.filter(
    (kind) => !existingKinds.has(kind)
  );

  if (missingKinds.length > 0) {
    await db.insert(tournamentChatChannels).values(
      missingKinds.map((kind) => ({
        tournamentId,
        kind,
      }))
    );
  }

  return db
    .select({
      id: tournamentChatChannels.id,
      kind: tournamentChatChannels.kind,
    })
    .from(tournamentChatChannels)
    .where(eq(tournamentChatChannels.tournamentId, tournamentId));
}
