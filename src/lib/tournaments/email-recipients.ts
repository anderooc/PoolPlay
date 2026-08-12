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

import { db } from "@/lib/db";
import {
  registrations,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { getTeamWaiverCompliance } from "@/lib/tournaments/waiver-compliance";

type RegistrationStatus = InferSelectModel<typeof registrations>["status"];

export type TournamentEmailAudience =
  | "captains_confirmed"
  | "captains_all"
  | "captains_pending"
  | "captains_waiver_incomplete";

export type CaptainEmailRecipient = {
  userId: string;
  email: string;
  fullName: string;
  teamIds: string[];
  teamNames: string[];
  teamUniversities: string[];
};

export type CaptainRecipientResult = {
  recipients: CaptainEmailRecipient[];
  skippedNoCaptainCount: number;
  skippedNoCaptainTeamNames: string[];
};

const CONFIRMED_STATUSES = ["confirmed", "checked_in"] as const satisfies readonly RegistrationStatus[];
const ALL_CAPTAIN_STATUSES = ["pending", "confirmed", "checked_in"] as const satisfies readonly RegistrationStatus[];

function statusesForAudience(
  audience: TournamentEmailAudience
): readonly RegistrationStatus[] {
  switch (audience) {
    case "captains_pending":
      return ["pending"];
    case "captains_confirmed":
    case "captains_waiver_incomplete":
      return CONFIRMED_STATUSES;
    case "captains_all":
      return ALL_CAPTAIN_STATUSES;
  }
}

export async function resolveCaptainEmailRecipients(
  tournament: {
    id: string;
    waiverEnabled: boolean;
    waiverAllowDownloadPrint: boolean;
    waiverAllowThirdParty: boolean;
    waiverAllowDigitalAck: boolean;
    waiverThirdPartyUrl: string | null;
    waiverRequiredBeforeCheckIn: boolean;
  },
  audience: TournamentEmailAudience
): Promise<CaptainRecipientResult> {
  const statuses = statusesForAudience(audience);

  const registrationRows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      teamUniversity: teams.university,
    })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.status, [...statuses])
      )
    );

  let eligibleTeams = registrationRows;

  if (audience === "captains_waiver_incomplete") {
    if (!tournament.waiverEnabled) {
      return {
        recipients: [],
        skippedNoCaptainCount: 0,
        skippedNoCaptainTeamNames: [],
      };
    }

    const incompleteTeams: typeof registrationRows = [];
    await Promise.all(
      registrationRows.map(async (row) => {
        const compliance = await getTeamWaiverCompliance(tournament, row.teamId);
        if (compliance.required && !compliance.complete) {
          incompleteTeams.push(row);
        }
      })
    );
    eligibleTeams = incompleteTeams;
  }

  if (eligibleTeams.length === 0) {
    return {
      recipients: [],
      skippedNoCaptainCount: 0,
      skippedNoCaptainTeamNames: [],
    };
  }

  const teamIds = eligibleTeams.map((row) => row.teamId);
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
        eq(teamMembers.role, "captain")
      )
    );

  const captainsByTeam = new Map<string, (typeof captainRows)[number][]>();
  for (const row of captainRows) {
    const list = captainsByTeam.get(row.teamId) ?? [];
    list.push(row);
    captainsByTeam.set(row.teamId, list);
  }

  const skippedNoCaptainTeamNames: string[] = [];
  const recipientMap = new Map<string, CaptainEmailRecipient>();

  for (const team of eligibleTeams) {
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

  const recipients = [...recipientMap.values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );

  return {
    recipients,
    skippedNoCaptainCount: skippedNoCaptainTeamNames.length,
    skippedNoCaptainTeamNames,
  };
}

export function audienceLabel(audience: TournamentEmailAudience): string {
  switch (audience) {
    case "captains_confirmed":
      return "Confirmed team captains";
    case "captains_all":
      return "All registered team captains";
    case "captains_pending":
      return "Pending team captains";
    case "captains_waiver_incomplete":
      return "Captains with incomplete waivers";
  }
}
