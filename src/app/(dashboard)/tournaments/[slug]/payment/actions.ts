"use server";

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

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  registrationPayments,
  registrations,
  teamMembers,
  tournaments,
} from "@/lib/db/schema";
import {
  backfillRegistrationPayments,
  getPaymentsByRegistrationIds,
} from "@/lib/tournaments/payment-compliance";
import { paymentSettingsFromTournament } from "@/lib/tournaments/payment-access";
import {
  canEditTournamentSetup,
  resolveIsTournamentOrganizer,
  tournamentPreparationLockedReason,
} from "@/lib/tournaments/permissions";

const paymentSettingsSchema = z
  .object({
    enabled: z.boolean(),
    requiredBeforeConfirm: z.boolean(),
    firstTeamFeeDollars: z.string().trim(),
    additionalTeamFeeDollars: z.string().trim(),
    venmoHandle: z.string().trim().max(200),
    zelleHandle: z.string().trim().max(200),
    cashappHandle: z.string().trim().max(200),
    otherInstructions: z.string().trim().max(2000),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) return;

    const first = parseDollarInput(value.firstTeamFeeDollars);
    if (first == null || first <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid first-team fee.",
        path: ["firstTeamFeeDollars"],
      });
    }

    if (value.additionalTeamFeeDollars) {
      const additional = parseDollarInput(value.additionalTeamFeeDollars);
      if (additional == null || additional < 0) {
        ctx.addIssue({
          code: "custom",
          message: "Additional team fee must be a valid amount.",
          path: ["additionalTeamFeeDollars"],
        });
      }
    }

    const hasHandle =
      Boolean(value.venmoHandle) ||
      Boolean(value.zelleHandle) ||
      Boolean(value.cashappHandle) ||
      Boolean(value.otherInstructions);

    if (!hasHandle) {
      ctx.addIssue({
        code: "custom",
        message:
          "Add at least one payment method or instructions for teams.",
        path: ["venmoHandle"],
      });
    }
  });

const submitPaymentSchema = z.object({
  registrationId: z.string().uuid(),
  method: z.enum([
    "venmo",
    "zelle",
    "cashapp",
    "check",
    "cash",
    "other",
  ]),
  note: z.string().trim().max(500),
});

function parseDollarInput(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

async function loadOrganizerTournament(tournamentId: string) {
  const user = await requireUser();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || !await resolveIsTournamentOrganizer(tournament, user)) {
    return { error: "Only the organizer can manage tournament payments." as const };
  }

  return { user, tournament };
}

async function loadCaptainRegistration(
  registrationId: string,
  userId: string
) {
  const [reg] = await db
    .select({
      id: registrations.id,
      tournamentId: registrations.tournamentId,
      teamId: registrations.teamId,
      status: registrations.status,
    })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!reg) {
    return { error: "Registration not found." as const };
  }

  const [membership] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, reg.teamId), eq(teamMembers.userId, userId))
    )
    .limit(1);

  if (!membership || membership.role !== "captain") {
    return { error: "Only team captains can submit payment." as const };
  }

  return { registration: reg };
}

export async function updateTournamentPaymentSettings(
  tournamentId: string,
  input: z.infer<typeof paymentSettingsSchema>
) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;
  const { tournament, user } = loaded;

  if (!await canEditTournamentSetup(tournament, user)) {
    return {
      error:
        tournamentPreparationLockedReason(tournament) ??
        "Payment settings cannot be changed in the current tournament stage.",
    };
  }

  const parsed = paymentSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid payment settings.",
    };
  }

  const firstTeamFeeCents = parsed.data.enabled
    ? dollarsToCents(parseDollarInput(parsed.data.firstTeamFeeDollars)!)
    : null;

  const additionalParsed = parsed.data.additionalTeamFeeDollars
    ? parseDollarInput(parsed.data.additionalTeamFeeDollars)
    : null;
  const additionalTeamFeeCents =
    parsed.data.enabled && additionalParsed != null
      ? dollarsToCents(additionalParsed)
      : parsed.data.enabled
        ? firstTeamFeeCents
        : null;

  await db
    .update(tournaments)
    .set({
      paymentEnabled: parsed.data.enabled,
      paymentRequiredBeforeConfirm: parsed.data.requiredBeforeConfirm,
      paymentFirstTeamFeeCents: firstTeamFeeCents,
      paymentAdditionalTeamFeeCents: additionalTeamFeeCents,
      paymentVenmoHandle: parsed.data.venmoHandle || null,
      paymentZelleHandle: parsed.data.zelleHandle || null,
      paymentCashappHandle: parsed.data.cashappHandle || null,
      paymentOtherInstructions: parsed.data.otherInstructions || null,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournamentId));

  if (parsed.data.enabled) {
    const [updated] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (updated) {
      await backfillRegistrationPayments(updated);
    }
  }

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/register", "page");
  return { success: true as const };
}

export async function captainSubmitPayment(
  input: z.infer<typeof submitPaymentSchema>
) {
  const user = await requireUser();
  const parsed = submitPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid payment submission.",
    };
  }

  const loaded = await loadCaptainRegistration(
    parsed.data.registrationId,
    user.id
  );
  if ("error" in loaded) return loaded;

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, loaded.registration.tournamentId))
    .limit(1);

  if (!tournament?.paymentEnabled) {
    return { error: "Payment tracking is not enabled for this tournament." };
  }

  const payments = await getPaymentsByRegistrationIds([parsed.data.registrationId]);
  const payment = payments.get(parsed.data.registrationId);
  if (!payment) {
    return { error: "No payment record for this registration." };
  }

  if (payment.status !== "unpaid") {
    return { error: "Payment has already been submitted or settled." };
  }

  const now = new Date();
  await db
    .update(registrationPayments)
    .set({
      status: "submitted",
      submittedMethod: parsed.data.method,
      submittedNote: parsed.data.note || null,
      submittedByUserId: user.id,
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(registrationPayments.registrationId, parsed.data.registrationId));

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

export async function hostConfirmPayment(registrationId: string) {
  const user = await requireUser();

  const [reg] = await db
    .select({
      id: registrations.id,
      tournamentId: registrations.tournamentId,
    })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!reg) return { error: "Registration not found." };

  const loaded = await loadOrganizerTournament(reg.tournamentId);
  if ("error" in loaded) return loaded;

  const payments = await getPaymentsByRegistrationIds([registrationId]);
  const payment = payments.get(registrationId);
  if (!payment) {
    return { error: "No payment record for this registration." };
  }

  if (payment.status !== "submitted" && payment.status !== "unpaid") {
    return { error: "Payment is already settled." };
  }

  const now = new Date();
  await db
    .update(registrationPayments)
    .set({
      status: "confirmed",
      confirmedByUserId: user.id,
      confirmedAt: now,
      updatedAt: now,
    })
    .where(eq(registrationPayments.registrationId, registrationId));

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

export async function hostWaivePayment(registrationId: string) {
  const user = await requireUser();

  const [reg] = await db
    .select({
      id: registrations.id,
      tournamentId: registrations.tournamentId,
    })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!reg) return { error: "Registration not found." };

  const loaded = await loadOrganizerTournament(reg.tournamentId);
  if ("error" in loaded) return loaded;

  const payments = await getPaymentsByRegistrationIds([registrationId]);
  const payment = payments.get(registrationId);
  if (!payment) {
    return { error: "No payment record for this registration." };
  }

  if (payment.status === "confirmed" || payment.status === "waived") {
    return { error: "Payment is already settled." };
  }

  const now = new Date();
  await db
    .update(registrationPayments)
    .set({
      status: "waived",
      waivedByUserId: user.id,
      waivedAt: now,
      updatedAt: now,
    })
    .where(eq(registrationPayments.registrationId, registrationId));

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}
