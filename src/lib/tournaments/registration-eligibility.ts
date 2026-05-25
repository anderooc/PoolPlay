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
