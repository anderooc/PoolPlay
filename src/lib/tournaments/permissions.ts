import { TEAM_GENDER_LABELS } from "@/lib/constants/team";
import { isAdmin } from "@/lib/auth";
import { isTournamentArchived } from "@/lib/tournament-status";
import {
  evaluateListingDetailsChecklist,
  listingDetailsHint,
} from "@/lib/tournaments/listing-details-checklist";
import type { TeamGender, TournamentStatus } from "@/types";

/** Fields required for permission checks across server and client. */
export type TournamentForPermissions = {
  organizerId: string;
  /** Metadata from hosting school at create. */
  hostSchoolId: string | null;
  status: string;
  date: string;
};

export type UserForPermissions = {
  id: string;
  role: string;
};

export function isTournamentOrganizer(
  tournament: Pick<TournamentForPermissions, "organizerId">,
  user: UserForPermissions
): boolean {
  return tournament.organizerId === user.id || isAdmin(user);
}

/** Draft tournaments are hidden from everyone except the organizer, admins, and
 *  members of the hosting school. Non-draft tournaments are visible to all
 *  authenticated users on the dashboard. */
export function canViewTournament(
  tournament: Pick<
    TournamentForPermissions,
    "status" | "organizerId" | "hostSchoolId"
  >,
  user: UserForPermissions,
  isHostSchoolMember: boolean
): boolean {
  if (tournament.status !== "draft") return true;
  if (isTournamentOrganizer(tournament, user)) return true;
  if (isAdmin(user)) return true;
  return isHostSchoolMember;
}

export function canManageTournament(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): boolean {
  return isTournamentOrganizer(tournament, user);
}

/** Non-draft tournaments are visible on public explore. */
export function isTournamentPublishedForPublic(
  tournament: Pick<TournamentForPermissions, "status">
): boolean {
  return tournament.status !== "draft";
}

export function canRegisterTeams(
  tournament: TournamentForPermissions
): boolean {
  if (isTournamentArchived(tournament.date)) return false;
  return tournament.status === "registration_open";
}

export function teamMatchesTournamentGender(
  teamGender: TeamGender,
  tournamentGender: TeamGender
): boolean {
  return teamGender === tournamentGender;
}

export function registrationGenderMismatchMessage(
  tournamentGender: TeamGender
): string {
  return `Only ${TEAM_GENDER_LABELS[tournamentGender]} teams can register for this tournament.`;
}

export function canEditTournamentSetup(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): boolean {
  if (!isTournamentOrganizer(tournament, user)) return false;
  if (isTournamentArchived(tournament.date)) return false;
  const allowed: TournamentStatus[] = [
    "draft",
    "registration_open",
    "registration_closed",
  ];
  return allowed.includes(tournament.status as TournamentStatus);
}

export function canEditRegistrations(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): boolean {
  if (!isTournamentOrganizer(tournament, user)) return false;
  if (isTournamentArchived(tournament.date)) return false;
  return (
    tournament.status === "registration_open" ||
    tournament.status === "registration_closed"
  );
}

export function canGeneratePoolsAndBrackets(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): boolean {
  if (!isTournamentOrganizer(tournament, user)) return false;
  if (isTournamentArchived(tournament.date)) return false;
  return tournament.status === "registration_closed";
}

/** Manual pool placement and pool generation require confirmed registrations. */
export function canAssignTeamsToPools(
  tournament: TournamentForPermissions,
  user: UserForPermissions,
  pendingRegistrationCount: number
): boolean {
  if (!canGeneratePoolsAndBrackets(tournament, user)) return false;
  return pendingRegistrationCount === 0;
}

export function poolAssignmentBlockedMessage(
  pendingRegistrationCount: number
): string | null {
  if (pendingRegistrationCount > 0) {
    return "Confirm all registered teams before assigning groups.";
  }
  return null;
}

export function canScheduleMatches(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): boolean {
  return canGeneratePoolsAndBrackets(tournament, user);
}

export function canScoreMatches(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): boolean {
  if (!isTournamentOrganizer(tournament, user)) return false;
  if (isTournamentArchived(tournament.date)) return false;
  return (
    tournament.status === "in_progress" || tournament.status === "completed"
  );
}

export function canCheckInRegistrations(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): boolean {
  if (!isTournamentOrganizer(tournament, user)) return false;
  if (isTournamentArchived(tournament.date)) return false;
  return tournament.status === "in_progress";
}

export function canWithdrawRegistration(
  tournament: TournamentForPermissions
): boolean {
  if (isTournamentArchived(tournament.date)) return false;
  return tournament.status === "registration_open";
}

export type HostChecklistStep = {
  id: string;
  label: string;
  done: boolean;
  hint?: string;
};

export function hostChecklistSteps(input: {
  status: string;
  description: string | null;
  address: string | null;
  divisionCount: number;
  courtCount: number;
  registrationCount: number;
  pendingCount: number;
  hasPools: boolean;
  hasBracket: boolean;
  hasScheduledMatches: boolean;
}): HostChecklistStep[] {
  const {
    status,
    description,
    address,
    divisionCount,
    courtCount,
    registrationCount,
    pendingCount,
    hasPools,
    hasBracket,
    hasScheduledMatches,
  } = input;

  const listingCheck = evaluateListingDetailsChecklist({
    description,
    address,
    hasScheduledMatches,
  });

  return [
    {
      id: "listing",
      label: "Finalize details, fees & start time",
      done: listingCheck.complete,
      hint: listingCheck.complete
        ? undefined
        : listingDetailsHint(listingCheck, hasScheduledMatches),
    },
    {
      id: "setup",
      label: "Add pools and courts",
      done: divisionCount > 0 && courtCount > 0,
      hint: "Configure competition structure before opening registration.",
    },
    {
      id: "open",
      label: "Open registration",
      done: status !== "draft",
      hint: "Set status to Registration open when ready for teams.",
    },
    {
      id: "confirm",
      label: "Confirm registered teams",
      done:
        status !== "draft" &&
        status !== "registration_open" &&
        (registrationCount === 0 || pendingCount === 0),
      hint:
        pendingCount > 0
          ? `${pendingCount} pending approval`
          : "Approve captains or close registration.",
    },
    {
      id: "structure",
      label: "Assign pools and generate groups",
      done: hasPools,
      hint: "Confirm teams, close registration, assign pools, then generate groups.",
    },
    {
      id: "bracket",
      label: "Generate brackets",
      done: hasBracket,
      hint: "Create elimination brackets after group play is set.",
    },
    {
      id: "schedule",
      label: "Schedule matches",
      done: hasScheduledMatches,
      hint: "Use the schedule page to assign courts and times.",
    },
    {
      id: "run",
      label: "Run event (live scoring)",
      done: status === "in_progress" || status === "completed",
      hint: "Set status to In progress on event day.",
    },
  ];
}
