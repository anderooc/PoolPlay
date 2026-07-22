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
import { registrations } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import {
  resolveIsTournamentOrganizer,
  type TournamentForPermissions,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";

const WAIVER_REGISTRATION_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
] as const;

export type TournamentWaiverSettings = {
  enabled: boolean;
  allowDownloadPrint: boolean;
  allowThirdParty: boolean;
  allowDigitalAck: boolean;
  thirdPartyUrl: string | null;
  requiredBeforeCheckIn: boolean;
};

export function waiverSettingsFromTournament(tournament: {
  waiverEnabled: boolean;
  waiverAllowDownloadPrint: boolean;
  waiverAllowThirdParty: boolean;
  waiverAllowDigitalAck: boolean;
  waiverThirdPartyUrl: string | null;
  waiverRequiredBeforeCheckIn: boolean;
}): TournamentWaiverSettings {
  return {
    enabled: tournament.waiverEnabled,
    allowDownloadPrint: tournament.waiverAllowDownloadPrint,
    allowThirdParty: tournament.waiverAllowThirdParty,
    allowDigitalAck: tournament.waiverAllowDigitalAck,
    thirdPartyUrl: tournament.waiverThirdPartyUrl,
    requiredBeforeCheckIn: tournament.waiverRequiredBeforeCheckIn,
  };
}

export async function userCanAccessTournamentWaiver(
  tournament: TournamentForPermissions & { id: string },
  user: UserForPermissions,
  userTeamIds: Iterable<string>
): Promise<boolean> {
  if (await resolveIsTournamentOrganizer(tournament, user)) return true;
  if (isAdmin(user)) return true;

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
        inArray(registrations.status, [...WAIVER_REGISTRATION_STATUSES])
      )
    )
    .limit(1);

  return Boolean(row);
}

export function captainCanAttestOfflineWaiver(
  settings: TournamentWaiverSettings
): boolean {
  return settings.allowDownloadPrint || settings.allowThirdParty;
}
