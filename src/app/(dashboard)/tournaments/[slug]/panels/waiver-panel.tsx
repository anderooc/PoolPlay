import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { registrations, teams } from "@/lib/db/schema";
import {
  waiverSettingsFromTournament,
  type TournamentWaiverSettings,
} from "@/lib/tournaments/waiver-access";
import {
  getLatestTournamentWaiver,
  getTeamWaiverCompliance,
} from "@/lib/tournaments/waiver-compliance";
import { TournamentWaiverSettingsPanel } from "../waiver-settings-panel";
import { TeamWaiverPanel } from "../team-waiver-panel";

const REGISTERED_STATUSES = ["pending", "confirmed", "checked_in"] as const;

export async function TournamentWaiverTabPanel({
  tournament,
  userId,
  myTeamIds,
  captainTeamIds,
  isOrganizer,
}: {
  tournament: {
    id: string;
    slug: string;
    waiverEnabled: boolean;
    waiverAllowDownloadPrint: boolean;
    waiverAllowThirdParty: boolean;
    waiverAllowDigitalAck: boolean;
    waiverThirdPartyUrl: string | null;
    waiverRequiredBeforeCheckIn: boolean;
  };
  userId: string;
  myTeamIds: string[];
  captainTeamIds: Set<string>;
  isOrganizer: boolean;
}) {
  const settings: TournamentWaiverSettings =
    waiverSettingsFromTournament(tournament);
  const latestWaiver = await getLatestTournamentWaiver(tournament.id);

  const registrationRows =
    isOrganizer || myTeamIds.length > 0
      ? await db
          .select({
            teamId: teams.id,
            teamName: teams.name,
          })
          .from(registrations)
          .innerJoin(teams, eq(registrations.teamId, teams.id))
          .where(
            isOrganizer
              ? and(
                  eq(registrations.tournamentId, tournament.id),
                  inArray(registrations.status, [...REGISTERED_STATUSES])
                )
              : and(
                  eq(registrations.tournamentId, tournament.id),
                  inArray(registrations.status, [...REGISTERED_STATUSES]),
                  inArray(registrations.teamId, myTeamIds)
                )
          )
      : [];

  const uniqueTeams = new Map<string, { teamId: string; teamName: string }>();
  for (const row of registrationRows) {
    uniqueTeams.set(row.teamId, {
      teamId: row.teamId,
      teamName: row.teamName,
    });
  }

  const teamSections = await Promise.all(
    [...uniqueTeams.values()].map(async (team) => ({
      ...team,
      compliance: await getTeamWaiverCompliance(tournament, team.teamId),
    }))
  );

  teamSections.sort((a, b) => a.teamName.localeCompare(b.teamName));

  return (
    <div className="space-y-4">
      <TournamentWaiverSettingsPanel
        tournamentId={tournament.id}
        slug={tournament.slug}
        canEdit={isOrganizer}
        initialSettings={settings}
        initialWaiver={
          latestWaiver
            ? {
                fileName: latestWaiver.fileName,
                version: latestWaiver.version,
                uploadedAt: latestWaiver.uploadedAt,
              }
            : null
        }
      />
      <TeamWaiverPanel
        tournamentId={tournament.id}
        slug={tournament.slug}
        settings={settings}
        teams={teamSections}
        currentUserId={userId}
        captainTeamIds={captainTeamIds}
        isOrganizer={isOrganizer}
      />
    </div>
  );
}
