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

import type { SchoolVerificationStatus, TeamVerificationStatus } from "@/types";

export function isStandaloneTeam(schoolId: string | null | undefined): boolean {
  return schoolId == null;
}

export function isTeamVerifiedForTournament(
  status: TeamVerificationStatus
): boolean {
  return status === "verified";
}

export function teamEligibleForTournamentRegistration(
  schoolId: string | null,
  schoolVerificationStatus: SchoolVerificationStatus | null | undefined,
  teamVerificationStatus: TeamVerificationStatus
): boolean {
  if (schoolId) {
    return schoolVerificationStatus === "verified";
  }
  return teamVerificationStatus === "verified";
}

export const TEAM_UNVERIFIED_REGISTRATION_ERROR =
  "This team is not verified yet and cannot register for tournaments.";

export const TEAM_PENDING_REGISTRATION_ERROR =
  "This standalone team is pending admin approval and cannot register for tournaments yet.";

export const TEAM_REJECTED_REGISTRATION_ERROR =
  "This team was not approved and cannot register for tournaments.";

export function teamRegistrationBlockReason(
  schoolId: string | null,
  schoolVerificationStatus: SchoolVerificationStatus | null | undefined,
  teamVerificationStatus: TeamVerificationStatus
): string | null {
  if (teamEligibleForTournamentRegistration(
    schoolId,
    schoolVerificationStatus,
    teamVerificationStatus
  )) {
    return null;
  }
  if (schoolId) {
    return "This team belongs to a school that is not verified yet and cannot register for tournaments.";
  }
  if (teamVerificationStatus === "pending") {
    return TEAM_PENDING_REGISTRATION_ERROR;
  }
  if (teamVerificationStatus === "rejected") {
    return TEAM_REJECTED_REGISTRATION_ERROR;
  }
  return TEAM_UNVERIFIED_REGISTRATION_ERROR;
}
