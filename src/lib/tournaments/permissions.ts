import { TEAM_GENDER_LABELS } from "@/lib/constants/team";
import { isAdmin } from "@/lib/auth";
import { isTournamentArchived } from "@/lib/tournament-status";
import type { PlayFormat } from "@/lib/labels/play-format";
import {
  evaluateListingDetailsChecklist,
  listingDetailsHint,
} from "@/lib/tournaments/listing-details-checklist";
import {
  bracketSettingsChecklistComplete,
  bracketSettingsChecklistHint,
  poolSettingsChecklistComplete,
  poolSettingsChecklistHint,
} from "@/lib/tournaments/tournament-settings-checklist";
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

/** Pool standings, matches, and brackets are host-only until released. */
export function canViewDivisionPoolPlay(
  tournament: Pick<TournamentForPermissions, "organizerId">,
  user: UserForPermissions,
  poolsReleasedAt: Date | string | null
): boolean {
  if (isTournamentOrganizer(tournament, user)) return true;
  return poolsReleasedAt != null;
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
    return "Confirm all registered teams before generating matches or brackets.";
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

/**
 * Who may run a single match's warmup/start/scorekeeping. The host always can
 * (full control / fallback). Otherwise any member of the assigned ref team can,
 * but only while the tournament is in progress.
 */
export function canRefereeMatch(
  tournament: Pick<
    TournamentForPermissions,
    "organizerId" | "status" | "date"
  >,
  user: UserForPermissions,
  match: { refTeamId: string | null },
  userTeamIds: Iterable<string>
): boolean {
  if (isTournamentArchived(tournament.date)) return false;
  if (isTournamentOrganizer(tournament, user)) return true;
  if (tournament.status !== "in_progress") return false;
  if (!match.refTeamId) return false;
  const ids =
    userTeamIds instanceof Set ? userTeamIds : new Set(userTeamIds);
  return ids.has(match.refTeamId);
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
  playFormat: PlayFormat | string;
  divisionCount: number;
  courtCount: number;
  registrationCount: number;
  pendingCount: number;
  matchFormat: string;
  setStartingScore: number;
  setTargetScore: number;
  tiebreakTargetScore: number;
  warmupFormat: string;
  poolTiebreakCriteria: readonly string[];
  poolSettingsSavedAt: Date | null;
  bracketCount: number;
  goldTeamCount: number | null;
  silverTeamCount: number | null;
  bracketSettingsSavedAt: Date | null;
  hasPools: boolean;
  hasPoolsReleased: boolean;
  hasSeededBrackets: boolean;
  hasScheduledMatches: boolean;
}): HostChecklistStep[] {
  const {
    status,
    description,
    address,
    playFormat,
    divisionCount,
    courtCount,
    registrationCount,
    pendingCount,
    matchFormat,
    setStartingScore,
    setTargetScore,
    tiebreakTargetScore,
    warmupFormat,
    poolTiebreakCriteria,
    poolSettingsSavedAt,
    bracketCount,
    goldTeamCount,
    silverTeamCount,
    bracketSettingsSavedAt,
    hasPools,
    hasPoolsReleased,
    hasSeededBrackets,
    hasScheduledMatches,
  } = input;

  const isPoolToBracket = playFormat === "pool_to_bracket";

  const poolSettingsInput = {
    matchFormat,
    setStartingScore,
    setTargetScore,
    tiebreakTargetScore,
    warmupFormat,
    poolTiebreakCriteria,
    poolSettingsSavedAt,
    hasPoolMatches: hasPools,
  };

  const bracketSettingsInput = {
    playFormat,
    bracketCount,
    goldTeamCount,
    silverTeamCount,
    bracketSettingsSavedAt,
  };

  const poolSettingsDone = poolSettingsChecklistComplete(poolSettingsInput);
  const bracketSettingsDone =
    bracketSettingsChecklistComplete(bracketSettingsInput);

  const listingCheck = evaluateListingDetailsChecklist({
    description,
    address,
    hasScheduledMatches,
  });

  const steps: HostChecklistStep[] = [
    {
      id: "listing",
      label: "Finalize listing details, fees & start time",
      done: listingCheck.complete,
      hint: listingCheck.complete
        ? undefined
        : listingDetailsHint(listingCheck, hasScheduledMatches),
    },
    {
      id: "setup",
      label: "Add pools and courts",
      done: divisionCount > 0 && courtCount > 0,
      hint: "Setup tab: add pools and courts. Play format was chosen when you created the tournament.",
    },
    {
      id: "open",
      label: "Open registration",
      done: status !== "draft",
      hint: "Set status to Registration open when the listing is ready for teams.",
    },
    {
      id: "confirm",
      label: "Close registration & confirm teams",
      done:
        status !== "draft" &&
        status !== "registration_open" &&
        (registrationCount === 0 || pendingCount === 0),
      hint:
        pendingCount > 0
          ? `${pendingCount} pending approval on the Pending tab`
          : "Approve captains on Pending, then close registration.",
    },
    {
      id: "pool-settings",
      label: "Configure pool settings",
      done: poolSettingsDone,
      hint: poolSettingsDone
        ? undefined
        : poolSettingsChecklistHint(poolSettingsInput),
    },
    {
      id: "pools",
      label: isPoolToBracket
        ? "Assign teams, seed pools & generate matches"
        : "Assign teams & seed the bracket",
      done: hasPools,
      hint: isPoolToBracket
        ? "Teams tab: assign teams to pools. Pools tab: set seed order and save to create round-robin matches."
        : "Teams tab: assign teams. Pools tab: save seed order to build the elimination bracket.",
    },
  ];

  if (isPoolToBracket) {
    steps.push({
      id: "bracket-settings",
      label: "Configure bracket tiers",
      done: bracketSettingsDone,
      hint: bracketSettingsDone
        ? undefined
        : bracketSettingsChecklistHint(bracketSettingsInput),
    });
    steps.push({
      id: "release",
      label: "Release pools to teams",
      done: hasPoolsReleased,
      hint: "Pools tab: release when schedules are ready for captains and fans to view.",
    });
    steps.push({
      id: "bracket",
      label: "Seed brackets from pool play",
      done: hasSeededBrackets,
      hint: "Bracket tab: brackets seed automatically when every pool finishes.",
    });
  } else {
    steps.push({
      id: "bracket",
      label: "Confirm bracket is seeded",
      done: hasSeededBrackets,
      hint: "Bracket tab: teams appear once pool seeding is saved.",
    });
  }

  steps.push(
    {
      id: "schedule",
      label: "Schedule matches",
      done: hasScheduledMatches,
      hint: "Schedule page: assign courts and start times, or set times on the Matches tab.",
    },
    {
      id: "run",
      label: "Run event (live scoring)",
      done: status === "in_progress" || status === "completed",
      hint: "Set status to In progress on event day.",
    }
  );

  return steps;
}
