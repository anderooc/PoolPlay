import { db } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import {
  isTournamentOrganizer,
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
  if (isTournamentOrganizer(tournament, user)) return true;
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
