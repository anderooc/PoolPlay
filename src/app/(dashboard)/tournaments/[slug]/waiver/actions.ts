"use server";

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

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  registrations,
  teamMembers,
  tournamentWaivers,
  tournaments,
  waiverCompletions,
} from "@/lib/db/schema";
import { WAIVER_MAX_BYTES } from "@/lib/supabase/admin";
import {
  captainCanAttestOfflineWaiver,
  waiverSettingsFromTournament,
} from "@/lib/tournaments/waiver-access";
import { getLatestTournamentWaiver } from "@/lib/tournaments/waiver-compliance";
import {
  tournamentWaiverStoragePath,
  uploadTournamentWaiverPdf,
} from "@/lib/tournaments/waiver-storage";
import { isPdfBytes } from "@/lib/security/pdf";
import {
  canEditTournamentSetup,
  resolveIsTournamentOrganizer,
  tournamentPreparationLockedReason,
} from "@/lib/tournaments/permissions";

const waiverSettingsSchema = z
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
        if (url.protocol !== "https:") {
          throw new Error("invalid");
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Third-party link must be a valid HTTPS URL.",
          path: ["thirdPartyUrl"],
        });
      }
    }
  });

async function loadOrganizerTournament(tournamentId: string) {
  const user = await requireUser();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || !await resolveIsTournamentOrganizer(tournament, user)) {
    return { error: "Only the organizer can manage tournament waivers." as const };
  }

  return { user, tournament };
}

async function loadRegisteredTeamMembership(
  tournamentId: string,
  teamId: string,
  userId: string
) {
  const [registration] = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.teamId, teamId)
      )
    )
    .limit(1);

  if (!registration) {
    return { error: "Team is not registered for this tournament." as const };
  }

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (!membership) {
    return { error: "You are not on this team roster." as const };
  }

  return { membership };
}

export async function updateTournamentWaiverSettings(
  tournamentId: string,
  input: z.infer<typeof waiverSettingsSchema>
) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;
  const { tournament } = loaded;

  if (!await canEditTournamentSetup(tournament, loaded.user)) {
    return {
      error:
        tournamentPreparationLockedReason(tournament) ??
        "Waiver settings cannot be changed in the current tournament stage.",
    };
  }

  const parsed = waiverSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid waiver settings." };
  }

  if (parsed.data.enabled) {
    const waiver = await getLatestTournamentWaiver(tournamentId);
    if (!waiver) {
      return { error: "Upload a waiver PDF before requiring teams to sign." };
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
    .where(eq(tournaments.id, tournamentId));

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

export async function uploadTournamentWaiver(
  tournamentId: string,
  formData: FormData
) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;
  const { user, tournament } = loaded;

  if (!await canEditTournamentSetup(tournament, user)) {
    return {
      error:
        tournamentPreparationLockedReason(tournament) ??
        "Waiver files cannot be uploaded in the current tournament stage.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a PDF file to upload." };
  }

  if (file.type !== "application/pdf") {
    return { error: "Waiver must be a PDF file." };
  }

  if (file.size > WAIVER_MAX_BYTES) {
    return { error: "Waiver PDF must be 10 MB or smaller." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdfBytes(bytes)) {
    return { error: "Waiver must be a valid PDF file." };
  }

  const waiverId = randomUUID();
  const storagePath = tournamentWaiverStoragePath(tournamentId, waiverId);

  const [versionRow] = await db
    .select({ maxVersion: max(tournamentWaivers.version) })
    .from(tournamentWaivers)
    .where(eq(tournamentWaivers.tournamentId, tournamentId));

  const version = (versionRow?.maxVersion ?? 0) + 1;

  try {
    await uploadTournamentWaiverPdf(storagePath, bytes);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not upload waiver PDF. Check storage configuration.",
    };
  }

  const [inserted] = await db
    .insert(tournamentWaivers)
    .values({
      id: waiverId,
      tournamentId,
      storagePath,
      fileName: file.name,
      version,
      uploadedByUserId: user.id,
    })
    .returning();

  revalidatePath("/tournaments/[slug]", "page");
  return {
    success: true as const,
    waiver: {
      id: inserted.id,
      fileName: inserted.fileName,
      version: inserted.version,
      uploadedAt: inserted.uploadedAt,
    },
  };
}

export async function captainAttestWaiverPlayer(
  tournamentId: string,
  teamId: string,
  playerUserId: string
) {
  const user = await requireUser();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament?.waiverEnabled) {
    return { error: "This tournament does not require a waiver." };
  }

  const settings = waiverSettingsFromTournament(tournament);
  if (!captainCanAttestOfflineWaiver(settings)) {
    return {
      error: "The host only allows digital acknowledgment for this waiver.",
    };
  }

  const [captainMembership] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (!captainMembership || captainMembership.role !== "captain") {
    return { error: "Only team captains can attest offline waiver completion." };
  }

  const roster = await loadRegisteredTeamMembership(
    tournamentId,
    teamId,
    playerUserId
  );
  if ("error" in roster) return roster;

  const waiver = await getLatestTournamentWaiver(tournamentId);
  if (!waiver) {
    return { error: "No waiver has been uploaded for this tournament yet." };
  }

  await db
    .insert(waiverCompletions)
    .values({
      waiverId: waiver.id,
      tournamentId,
      teamId,
      userId: playerUserId,
      method: "captain_attested",
      attestedByUserId: user.id,
    })
    .onConflictDoUpdate({
      target: [waiverCompletions.waiverId, waiverCompletions.userId],
      set: {
        teamId,
        method: "captain_attested",
        signedName: null,
        completedAt: new Date(),
        attestedByUserId: user.id,
        waivedByUserId: null,
      },
    });

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

export async function acknowledgeWaiverDigitally(
  tournamentId: string,
  teamId: string,
  signedName: string
) {
  const user = await requireUser();
  const trimmed = signedName.trim();
  if (!trimmed || trimmed.length > 200) {
    return { error: "Enter your full legal name to acknowledge the waiver." };
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament?.waiverEnabled) {
    return { error: "This tournament does not require a waiver." };
  }

  const settings = waiverSettingsFromTournament(tournament);
  if (!settings.allowDigitalAck) {
    return {
      error: "The host does not allow digital acknowledgment for this waiver.",
    };
  }

  const membership = await loadRegisteredTeamMembership(
    tournamentId,
    teamId,
    user.id
  );
  if ("error" in membership) return membership;

  const waiver = await getLatestTournamentWaiver(tournamentId);
  if (!waiver) {
    return { error: "No waiver has been uploaded for this tournament yet." };
  }

  await db
    .insert(waiverCompletions)
    .values({
      waiverId: waiver.id,
      tournamentId,
      teamId,
      userId: user.id,
      method: "digital",
      signedName: trimmed,
    })
    .onConflictDoUpdate({
      target: [waiverCompletions.waiverId, waiverCompletions.userId],
      set: {
        teamId,
        method: "digital",
        signedName: trimmed,
        completedAt: new Date(),
        attestedByUserId: null,
        waivedByUserId: null,
      },
    });

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

export async function hostWaivePlayerWaiver(
  tournamentId: string,
  teamId: string,
  playerUserId: string
) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;
  const { user, tournament } = loaded;

  if (!tournament.waiverEnabled) {
    return { error: "This tournament does not require a waiver." };
  }

  const roster = await loadRegisteredTeamMembership(
    tournamentId,
    teamId,
    playerUserId
  );
  if ("error" in roster) return roster;

  const waiver = await getLatestTournamentWaiver(tournamentId);
  if (!waiver) {
    return { error: "No waiver has been uploaded for this tournament yet." };
  }

  await db
    .insert(waiverCompletions)
    .values({
      waiverId: waiver.id,
      tournamentId,
      teamId,
      userId: playerUserId,
      method: "host_override",
      waivedByUserId: user.id,
    })
    .onConflictDoUpdate({
      target: [waiverCompletions.waiverId, waiverCompletions.userId],
      set: {
        teamId,
        method: "host_override",
        signedName: null,
        completedAt: new Date(),
        attestedByUserId: null,
        waivedByUserId: user.id,
      },
    });

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

export async function clearWaiverCompletion(
  tournamentId: string,
  teamId: string,
  playerUserId: string
) {
  const user = await requireUser();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) return { error: "Tournament not found." };

  const waiver = await getLatestTournamentWaiver(tournamentId);
  if (!waiver) return { success: true as const };

  if (await resolveIsTournamentOrganizer(tournament, user)) {
    await db
      .delete(waiverCompletions)
      .where(
        and(
          eq(waiverCompletions.waiverId, waiver.id),
          eq(waiverCompletions.teamId, teamId),
          eq(waiverCompletions.userId, playerUserId)
        )
      );
    revalidatePath("/tournaments/[slug]", "page");
    return { success: true as const };
  }

  const [captainMembership] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (!captainMembership || captainMembership.role !== "captain") {
    return { error: "Only captains or the host can clear waiver attestation." };
  }

  const [completion] = await db
    .select({ method: waiverCompletions.method })
    .from(waiverCompletions)
    .where(
      and(
        eq(waiverCompletions.waiverId, waiver.id),
        eq(waiverCompletions.teamId, teamId),
        eq(waiverCompletions.userId, playerUserId)
      )
    )
    .limit(1);

  if (completion?.method !== "captain_attested") {
    return { error: "Only captain attestations can be cleared this way." };
  }

  await db
    .delete(waiverCompletions)
    .where(
      and(
        eq(waiverCompletions.waiverId, waiver.id),
        eq(waiverCompletions.teamId, teamId),
        eq(waiverCompletions.userId, playerUserId)
      )
    );

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}
