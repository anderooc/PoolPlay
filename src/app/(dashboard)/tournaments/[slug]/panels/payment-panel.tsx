/*
 * PoolPlay - Collegiate club volleyball tournament hub
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
  paymentSettingsFromTournament,
  type TournamentPaymentSettings,
} from "@/lib/tournaments/payment-settings";
import { getPaymentsByRegistrationIds } from "@/lib/tournaments/payment-compliance";
import { TournamentPaymentSettingsPanel } from "../payment-settings-panel";
import { TeamPaymentPanel } from "../team-payment-panel";

const REGISTERED_STATUSES = ["pending", "confirmed", "checked_in"] as const;

export async function TournamentPaymentTabPanel({
  tournament,
  myTeamIds,
  captainTeamIds,
  isOrganizer,
  canEditOrganizerSettings,
  lockedReason,
}: {
  tournament: {
    id: string;
    paymentEnabled: boolean;
    paymentRequiredBeforeConfirm: boolean;
    paymentFirstTeamFeeCents: number | null;
    paymentAdditionalTeamFeeCents: number | null;
    paymentVenmoHandle: string | null;
    paymentZelleHandle: string | null;
    paymentCashappHandle: string | null;
    paymentOtherInstructions: string | null;
  };
  myTeamIds: string[];
  captainTeamIds: Set<string>;
  isOrganizer: boolean;
  canEditOrganizerSettings: boolean;
  lockedReason?: string | null;
}) {
  const settings: TournamentPaymentSettings =
    paymentSettingsFromTournament(tournament);

  const registrationRows =
    isOrganizer || myTeamIds.length > 0
      ? await db
          .select({
            registrationId: registrations.id,
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

  const payments = await getPaymentsByRegistrationIds(
    registrationRows.map((r) => r.registrationId)
  );

  const teamSections = registrationRows
    .map((row) => {
      const payment = payments.get(row.registrationId);
      if (!payment) return null;
      return {
        registrationId: row.registrationId,
        teamId: row.teamId,
        teamName: row.teamName,
        payment,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  return (
    <div className="space-y-4">
      {lockedReason ? (
        <p className="text-sm text-muted-foreground">{lockedReason}</p>
      ) : null}
      <TournamentPaymentSettingsPanel
        tournamentId={tournament.id}
        canEdit={canEditOrganizerSettings}
        initialSettings={settings}
      />
      <TeamPaymentPanel
        settings={settings}
        teams={teamSections}
        captainTeamIds={captainTeamIds}
        isOrganizer={isOrganizer}
      />
    </div>
  );
}
