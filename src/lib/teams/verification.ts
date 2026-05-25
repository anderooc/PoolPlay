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
