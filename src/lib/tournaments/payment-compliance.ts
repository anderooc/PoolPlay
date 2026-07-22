/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { db } from "@/lib/db";
import {
  registrationPayments,
  registrations,
  teams,
} from "@/lib/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type {
  RegistrationPaymentMethod,
  RegistrationPaymentStatus,
} from "@/types";
import {
  paymentSettingsFromTournament,
  type TournamentPaymentSettings,
} from "@/lib/tournaments/payment-settings";

const ACTIVE_REGISTRATION_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
] as const;

export type RegistrationPaymentRow = {
  registrationId: string;
  teamId: string;
  amountCents: number;
  status: RegistrationPaymentStatus;
  submittedMethod: RegistrationPaymentMethod | null;
  submittedNote: string | null;
  submittedAt: Date | null;
};

export async function countSchoolRegistrationsForFee(
  tournamentId: string,
  schoolId: string | null
): Promise<number> {
  if (!schoolId) return 0;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(teams.schoolId, schoolId),
        inArray(registrations.status, [...ACTIVE_REGISTRATION_STATUSES])
      )
    );

  return row?.count ?? 0;
}

export async function computeRegistrationFeeCents(
  settings: TournamentPaymentSettings,
  tournamentId: string,
  schoolId: string | null
): Promise<number | null> {
  if (!settings.enabled || settings.firstTeamFeeCents == null) return null;

  const additional =
    settings.additionalTeamFeeCents ?? settings.firstTeamFeeCents;
  const priorCount = await countSchoolRegistrationsForFee(
    tournamentId,
    schoolId
  );

  return priorCount === 0 ? settings.firstTeamFeeCents : additional;
}

export async function createRegistrationPayment(
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
  },
  registrationId: string,
  teamId: string,
  schoolId: string | null,
  opts?: {
    hostWaived?: boolean;
    hostUserId?: string;
  }
): Promise<void> {
  const settings = paymentSettingsFromTournament(tournament);
  if (!settings.enabled) return;

  const amountCents = await computeRegistrationFeeCents(
    settings,
    tournament.id,
    schoolId
  );
  if (amountCents == null) return;

  const now = new Date();
  const waived = Boolean(opts?.hostWaived);

  await db
    .insert(registrationPayments)
    .values({
      registrationId,
      tournamentId: tournament.id,
      teamId,
      amountCents,
      status: waived ? "waived" : "unpaid",
      waivedByUserId: waived ? opts?.hostUserId ?? null : null,
      waivedAt: waived ? now : null,
    })
    .onConflictDoNothing();
}

export async function backfillRegistrationPayments(
  tournament: Parameters<typeof createRegistrationPayment>[0]
): Promise<void> {
  const settings = paymentSettingsFromTournament(tournament);
  if (!settings.enabled || settings.firstTeamFeeCents == null) return;

  const regRows = await db
    .select({
      id: registrations.id,
      teamId: registrations.teamId,
      registeredAt: registrations.registeredAt,
      schoolId: teams.schoolId,
    })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.status, [...ACTIVE_REGISTRATION_STATUSES])
      )
    )
    .orderBy(asc(registrations.registeredAt), asc(registrations.id));

  const existingRows = await db
    .select({ registrationId: registrationPayments.registrationId })
    .from(registrationPayments)
    .where(eq(registrationPayments.tournamentId, tournament.id));

  const existingIds = new Set(existingRows.map((r) => r.registrationId));
  const schoolCounts = new Map<string, number>();
  const additional =
    settings.additionalTeamFeeCents ?? settings.firstTeamFeeCents;

  for (const reg of regRows) {
    if (existingIds.has(reg.id)) continue;

    let amountCents: number;
    if (!reg.schoolId) {
      amountCents = settings.firstTeamFeeCents;
    } else {
      const prior = schoolCounts.get(reg.schoolId) ?? 0;
      amountCents =
        prior === 0 ? settings.firstTeamFeeCents : additional;
      schoolCounts.set(reg.schoolId, prior + 1);
    }

    await db.insert(registrationPayments).values({
      registrationId: reg.id,
      tournamentId: tournament.id,
      teamId: reg.teamId,
      amountCents,
      status: "unpaid",
    });
  }
}

export async function getPaymentsByRegistrationIds(
  registrationIds: string[]
): Promise<Map<string, RegistrationPaymentRow>> {
  if (registrationIds.length === 0) return new Map();

  const rows = await db
    .select({
      registrationId: registrationPayments.registrationId,
      teamId: registrationPayments.teamId,
      amountCents: registrationPayments.amountCents,
      status: registrationPayments.status,
      submittedMethod: registrationPayments.submittedMethod,
      submittedNote: registrationPayments.submittedNote,
      submittedAt: registrationPayments.submittedAt,
    })
    .from(registrationPayments)
    .where(inArray(registrationPayments.registrationId, registrationIds));

  return new Map(
    rows.map((row) => [
      row.registrationId,
      {
        registrationId: row.registrationId,
        teamId: row.teamId,
        amountCents: row.amountCents,
        status: row.status as RegistrationPaymentStatus,
        submittedMethod: row.submittedMethod as RegistrationPaymentMethod | null,
        submittedNote: row.submittedNote,
        submittedAt: row.submittedAt,
      },
    ])
  );
}

export function paymentBlocksConfirm(
  settings: TournamentPaymentSettings,
  payment: Pick<RegistrationPaymentRow, "status"> | null | undefined
): boolean {
  if (!settings.enabled || !settings.requiredBeforeConfirm) return false;
  if (!payment) return false;
  return payment.status !== "confirmed" && payment.status !== "waived";
}

export function paymentIsSettled(
  payment: Pick<RegistrationPaymentRow, "status"> | null | undefined
): boolean {
  return payment?.status === "confirmed" || payment?.status === "waived";
}
