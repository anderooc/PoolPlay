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

import "server-only";

import { randomUUID } from "crypto";
import { eq, max } from "drizzle-orm";
import { z } from "zod";
import type { AppUser } from "@/lib/auth";
import { flagBlockedContent } from "@/lib/admin/content-flags";
import { db } from "@/lib/db";
import { tournamentWaivers, tournaments } from "@/lib/db/schema";
import { WAIVER_MAX_BYTES } from "@/lib/supabase/admin";
import { isPdfBytes } from "@/lib/security/pdf";
import { backfillRegistrationPayments } from "@/lib/tournaments/payment-compliance";
import {
  paymentInstructionsText,
  paymentSettingsFromTournament,
} from "@/lib/tournaments/payment-settings";
import {
  canEditTournamentSetup,
  resolveIsTournamentOrganizer,
  tournamentPreparationLockedReason,
} from "@/lib/tournaments/permissions";
import { getLatestTournamentWaiver } from "@/lib/tournaments/waiver-compliance";
import {
  tournamentWaiverStoragePath,
  uploadTournamentWaiverPdf,
} from "@/lib/tournaments/waiver-storage";
import type {
  TournamentHostSettingsMutationResultContract,
  TournamentHostWaiverUploadResultContract,
  TournamentPacketHostContract,
} from "../contracts/tournament-host";
import type { TournamentPaymentSettingsContract } from "../contracts/tournament-ops";
import { badRequest, forbidden } from "../errors";
import { requirePostedTournament } from "./tournament-ops";

const PACKET_NOTES_MAX_LENGTH = 12000;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

const paymentSettingsUpdateSchema = z
  .object({
    enabled: z.boolean(),
    requiredBeforeConfirm: z.boolean(),
    firstTeamFeeCents: z.number().int().min(0).nullable(),
    additionalTeamFeeCents: z.number().int().min(0).nullable(),
    venmoHandle: z.string().trim().max(200),
    zelleHandle: z.string().trim().max(200),
    cashappHandle: z.string().trim().max(200),
    otherInstructions: z.string().trim().max(2000),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) return;
    if (value.firstTeamFeeCents == null || value.firstTeamFeeCents <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid first-team fee.",
        path: ["firstTeamFeeCents"],
      });
    }
    const hasHandle =
      Boolean(value.venmoHandle) ||
      Boolean(value.zelleHandle) ||
      Boolean(value.cashappHandle) ||
      Boolean(value.otherInstructions);
    if (!hasHandle) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one payment method or instructions for teams.",
        path: ["venmoHandle"],
      });
    }
  });

const waiverSettingsUpdateSchema = z
  .object({
    enabled: z.boolean(),
    allowDownloadPrint: z.boolean(),
    allowThirdParty: z.boolean(),
    allowDigitalAck: z.boolean(),
    thirdPartyUrl: z.string().trim().max(2000),
    requiredBeforeCheckIn: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) return;
    if (
      !value.allowDownloadPrint &&
      !value.allowThirdParty &&
      !value.allowDigitalAck
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one way teams can complete the waiver.",
        path: ["enabled"],
      });
    }
    if (value.allowThirdParty && !value.thirdPartyUrl) {
      ctx.addIssue({
        code: "custom",
        message: "Add a third-party signing link or disable that option.",
        path: ["thirdPartyUrl"],
      });
    }
    if (value.thirdPartyUrl) {
      try {
        const url = new URL(value.thirdPartyUrl);
        if (url.protocol !== "https:") throw new Error("invalid");
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Third-party link must be a valid HTTPS URL.",
          path: ["thirdPartyUrl"],
        });
      }
    }
  });

const packetUpdateSchema = z.object({
  notes: z.string().trim().max(PACKET_NOTES_MAX_LENGTH).optional(),
  accentColor: z
    .union([z.string().regex(HEX_COLOR_RE), z.null()])
    .optional(),
});

async function requireOrganizerSetupEdit(slug: string, user: AppUser) {
  const tournament = await requirePostedTournament(slug);
  if (!(await resolveIsTournamentOrganizer(tournament, user))) {
    throw forbidden("Only the tournament host can manage these settings.");
  }
  if (!(await canEditTournamentSetup(tournament, user))) {
    throw badRequest(
      tournamentPreparationLockedReason(tournament) ??
        "These settings cannot be changed in the current tournament stage."
    );
  }
  return tournament;
}

function toPaymentSettingsContract(
  tournament: Awaited<ReturnType<typeof requirePostedTournament>>
): TournamentPaymentSettingsContract {
  const settings = paymentSettingsFromTournament(tournament);
  return {
    enabled: settings.enabled,
    requiredBeforeConfirm: settings.requiredBeforeConfirm,
    firstTeamFeeCents: settings.firstTeamFeeCents,
    additionalTeamFeeCents: settings.additionalTeamFeeCents,
    venmoHandle: settings.venmoHandle,
    zelleHandle: settings.zelleHandle,
    cashappHandle: settings.cashappHandle,
    otherInstructions: settings.otherInstructions,
    instructionsText: paymentInstructionsText(settings),
  };
}

export async function loadTournamentPaymentSettingsForHost(
  slug: string,
  user: AppUser
): Promise<TournamentPaymentSettingsContract> {
  const tournament = await requireOrganizerSetupEdit(slug, user);
  return toPaymentSettingsContract(tournament);
}

export async function updateTournamentPaymentSettingsForHost(
  slug: string,
  user: AppUser,
  input: z.infer<typeof paymentSettingsUpdateSchema>
): Promise<TournamentHostSettingsMutationResultContract> {
  const tournament = await requireOrganizerSetupEdit(slug, user);
  const parsed = paymentSettingsUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid payment settings.");
  }

  const firstTeamFeeCents = parsed.data.enabled
    ? parsed.data.firstTeamFeeCents
    : null;
  const additionalTeamFeeCents = parsed.data.enabled
    ? (parsed.data.additionalTeamFeeCents ?? firstTeamFeeCents)
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
    .where(eq(tournaments.id, tournament.id));

  if (parsed.data.enabled) {
    const [updated] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournament.id))
      .limit(1);
    if (updated) await backfillRegistrationPayments(updated);
  }

  return { success: true };
}

export async function updateTournamentWaiverSettingsForHost(
  slug: string,
  user: AppUser,
  input: z.infer<typeof waiverSettingsUpdateSchema>
): Promise<TournamentHostSettingsMutationResultContract> {
  const tournament = await requireOrganizerSetupEdit(slug, user);
  const parsed = waiverSettingsUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid waiver settings.");
  }

  if (parsed.data.enabled) {
    const waiver = await getLatestTournamentWaiver(tournament.id);
    if (!waiver) {
      throw badRequest("Upload a waiver PDF before requiring teams to sign.");
    }
  }

  const thirdPartyUrl = parsed.data.allowThirdParty
    ? parsed.data.thirdPartyUrl || null
    : null;

  await db
    .update(tournaments)
    .set({
      waiverEnabled: parsed.data.enabled,
      waiverAllowDownloadPrint: parsed.data.allowDownloadPrint,
      waiverAllowThirdParty: parsed.data.allowThirdParty,
      waiverAllowDigitalAck: parsed.data.allowDigitalAck,
      waiverThirdPartyUrl: thirdPartyUrl,
      waiverRequiredBeforeCheckIn: parsed.data.requiredBeforeCheckIn,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournament.id));

  return { success: true };
}

export async function uploadTournamentWaiverPdfForHost(
  slug: string,
  user: AppUser,
  input: { base64: string; fileName?: string }
): Promise<TournamentHostWaiverUploadResultContract> {
  const tournament = await requireOrganizerSetupEdit(slug, user);

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(input.base64, "base64"));
  } catch {
    throw badRequest("Invalid PDF payload.");
  }

  if (bytes.byteLength > WAIVER_MAX_BYTES) {
    throw badRequest("Waiver PDF must be 10 MB or smaller.");
  }
  if (!isPdfBytes(bytes)) {
    throw badRequest("Waiver must be a valid PDF file.");
  }

  const waiverId = randomUUID();
  const storagePath = tournamentWaiverStoragePath(tournament.id, waiverId);

  const [versionRow] = await db
    .select({ maxVersion: max(tournamentWaivers.version) })
    .from(tournamentWaivers)
    .where(eq(tournamentWaivers.tournamentId, tournament.id));

  const version = (versionRow?.maxVersion ?? 0) + 1;
  const fileName = input.fileName?.trim() || "waiver.pdf";

  try {
    await uploadTournamentWaiverPdf(storagePath, bytes);
  } catch (error) {
    throw badRequest(
      error instanceof Error ? error.message : "Could not upload waiver PDF."
    );
  }

  await db.insert(tournamentWaivers).values({
    id: waiverId,
    tournamentId: tournament.id,
    storagePath,
    fileName,
    version,
    uploadedByUserId: user.id,
  });

  return {
    success: true,
    waiver: {
      id: waiverId,
      fileName,
      version,
      uploadedAt: new Date().toISOString(),
    },
  };
}

export async function loadTournamentPacketForHost(
  slug: string,
  user: AppUser
): Promise<TournamentPacketHostContract> {
  const tournament = await requireOrganizerSetupEdit(slug, user);
  return {
    notes: tournament.packetNotes,
    accentColor: tournament.packetAccentColor,
    canEdit: true,
    lockedReason: null,
  };
}

export async function updateTournamentPacketForHost(
  slug: string,
  user: AppUser,
  input: z.infer<typeof packetUpdateSchema>
): Promise<TournamentPacketHostContract> {
  const tournament = await requireOrganizerSetupEdit(slug, user);
  const parsed = packetUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid packet settings.");
  }

  if (parsed.data.notes !== undefined) {
    const contentError = await flagBlockedContent(user.id, [
      { area: "tournament.packet_notes", text: parsed.data.notes || null },
    ]);
    if (contentError) throw badRequest(contentError);
  }

  const updates: Partial<typeof tournaments.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.notes !== undefined) {
    updates.packetNotes = parsed.data.notes || null;
  }
  if (parsed.data.accentColor !== undefined) {
    updates.packetAccentColor = parsed.data.accentColor;
  }

  await db
    .update(tournaments)
    .set(updates)
    .where(eq(tournaments.id, tournament.id));

  const [updated] = await db
    .select({
      packetNotes: tournaments.packetNotes,
      packetAccentColor: tournaments.packetAccentColor,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournament.id))
    .limit(1);

  return {
    notes: updated?.packetNotes ?? null,
    accentColor: updated?.packetAccentColor ?? null,
    canEdit: true,
    lockedReason: null,
  };
}
