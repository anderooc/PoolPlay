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
  canEditOrganizerSettings,
  lockedReason,
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
  canEditOrganizerSettings: boolean;
  lockedReason?: string | null;
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
      {lockedReason ? (
        <p className="text-sm text-muted-foreground">{lockedReason}</p>
      ) : null}
      <TournamentWaiverSettingsPanel
        tournamentId={tournament.id}
        slug={tournament.slug}
        canEdit={canEditOrganizerSettings}
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
