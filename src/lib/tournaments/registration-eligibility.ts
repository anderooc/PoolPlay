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

import { teams, schools } from "@/lib/db/schema";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import {
  teamEligibleForTournamentRegistration,
  teamRegistrationBlockReason,
} from "@/lib/teams/verification";
import type { SchoolVerificationStatus, TeamVerificationStatus } from "@/types";

/** SQL filter for captains/host team lists. */
export const teamEligibleForTournamentRegistrationFilter = or(
  and(
    isNotNull(teams.schoolId),
    eq(schools.verificationStatus, "verified")
  ),
  and(isNull(teams.schoolId), eq(teams.verificationStatus, "verified"))
);

export function isSchoolVerifiedForTournament(
  status: SchoolVerificationStatus
): boolean {
  return status === "verified";
}

export {
  teamEligibleForTournamentRegistration,
  teamRegistrationBlockReason,
};

/** @deprecated Use teamRegistrationBlockReason */
export function teamBelongsToEligibleSchool(
  schoolId: string | null,
  schoolVerificationStatus: SchoolVerificationStatus | null | undefined,
  teamVerificationStatus?: TeamVerificationStatus
): boolean {
  return teamEligibleForTournamentRegistration(
    schoolId,
    schoolVerificationStatus,
    teamVerificationStatus ?? "pending"
  );
}

export const TEAM_UNVERIFIED_SCHOOL_REGISTRATION_ERROR =
  "This team belongs to a school that is not verified yet and cannot register for tournaments.";

export const SCHOOL_NOT_VERIFIED_FOR_TOURNAMENT_ERROR =
  "Only verified schools can be used when adding teams to a tournament.";
