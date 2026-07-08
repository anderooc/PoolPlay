import { db } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import {
  isTournamentOrganizer,
  type TournamentForPermissions,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";

export type { TournamentPaymentSettings } from "@/lib/tournaments/payment-settings";
export {
  formatFeeCents,
  paymentInstructionsText,
  paymentMethodLabel,
  paymentSettingsFromTournament,
  paymentStatusLabel,
} from "@/lib/tournaments/payment-settings";

const PAYMENT_REGISTRATION_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
] as const;

export async function userCanAccessTournamentPayment(
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
        inArray(registrations.status, [...PAYMENT_REGISTRATION_STATUSES])
      )
    )
    .limit(1);

  return Boolean(row);
}
