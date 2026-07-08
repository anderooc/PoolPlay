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
