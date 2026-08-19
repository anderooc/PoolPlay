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

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { flagBlockedContent } from "@/lib/admin/content-flags";
import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatTournamentDateDisplay } from "@/lib/date-iso";
import { isTeamRegion } from "@/lib/labels/team";
import { notifyCaptainsOfTournamentMessage } from "@/lib/notifications/tournament-events";
import {
  audienceLabel,
  resolveCaptainEmailRecipients,
  type TournamentEmailAudience,
} from "@/lib/tournaments/email-recipients";
import { resolveMatchingCaptainRecipients } from "@/lib/tournaments/matching-captains";
import {
  canEditTournamentPreparation,
  isTournamentPublishedForPublic,
  resolveIsTournamentOrganizer,
  tournamentPreparationLockedReason,
} from "@/lib/tournaments/permissions";
import {
  POSTING_ANNOUNCEMENT_BODY_MAX,
  POSTING_ANNOUNCEMENT_SUBJECT_MAX,
  sendTournamentPostingAnnouncement,
} from "@/lib/tournaments/send-posting-announcement";
import {
  buildWaiverReminderEmail,
  sendTournamentCaptainEmails,
  TOURNAMENT_EMAIL_BODY_MAX,
  TOURNAMENT_EMAIL_SUBJECT_MAX,
} from "@/lib/tournaments/send-tournament-email";

const audienceSchema = z.enum([
  "captains_confirmed",
  "captains_all",
  "captains_pending",
  "captains_waiver_incomplete",
]);

const customEmailSchema = z.object({
  audience: audienceSchema,
  subject: z.string().trim().min(1).max(TOURNAMENT_EMAIL_SUBJECT_MAX),
  body: z.string().trim().min(1).max(TOURNAMENT_EMAIL_BODY_MAX),
});

async function loadOrganizerTournament(tournamentId: string) {
  const user = await requireUser();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || !await resolveIsTournamentOrganizer(tournament, user)) {
    return { error: "Only the organizer can send tournament emails." as const };
  }

  if (!await canEditTournamentPreparation(tournament, user)) {
    return {
      error:
        tournamentPreparationLockedReason(tournament) ??
        "Emails cannot be sent in the current tournament stage.",
    } as const;
  }

  return { user, tournament };
}

export async function previewTournamentEmailRecipients(
  tournamentId: string,
  audience: TournamentEmailAudience
) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;

  const result = await resolveCaptainEmailRecipients(
    loaded.tournament,
    audience
  );

  return {
    success: true as const,
    recipientCount: result.recipients.length,
    skippedNoCaptainCount: result.skippedNoCaptainCount,
    skippedNoCaptainTeamNames: result.skippedNoCaptainTeamNames,
    audienceLabel: audienceLabel(audience),
  };
}

export async function sendTournamentCustomEmail(
  tournamentId: string,
  input: z.infer<typeof customEmailSchema>
) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;

  const parsed = customEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const contentError = await flagBlockedContent(loaded.user.id, [
    { area: "tournament.email_subject", text: parsed.data.subject },
    { area: "tournament.email_body", text: parsed.data.body },
  ]);
  if (contentError) return { error: contentError };

  const recipientResult = await resolveCaptainEmailRecipients(
    loaded.tournament,
    parsed.data.audience
  );

  const result = await sendTournamentCaptainEmails({
    tournamentId: loaded.tournament.id,
    tournamentSlug: loaded.tournament.slug,
    tournamentName: loaded.tournament.name,
    tournamentDateDisplay: formatTournamentDateDisplay(loaded.tournament.date),
    tournamentLocation: loaded.tournament.location,
    sentByUserId: loaded.user.id,
    kind: "custom",
    audience: parsed.data.audience,
    subject: parsed.data.subject,
    body: parsed.data.body,
    recipientResult,
    ctaTab: "setup",
    ctaLabel: "Open tournament",
  });

  if ("error" in result) return result;

  try {
    await notifyCaptainsOfTournamentMessage({
      recipients: recipientResult.recipients,
      tournamentId: loaded.tournament.id,
      tournamentSlug: loaded.tournament.slug,
      tournamentName: loaded.tournament.name,
      subject: parsed.data.subject,
    });
  } catch {
    // Email already sent; in-app copy is best-effort.
  }

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/notifications");
  return {
    success: true as const,
    recipientCount: result.recipientCount,
    skippedNoCaptainCount: result.skippedNoCaptainCount,
  };
}

export async function sendTournamentWaiverReminderEmail(tournamentId: string) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;

  if (!loaded.tournament.waiverEnabled) {
    return { error: "Waivers are not enabled for this tournament." };
  }

  const audience: TournamentEmailAudience = "captains_waiver_incomplete";
  const recipientResult = await resolveCaptainEmailRecipients(
    loaded.tournament,
    audience
  );

  const template = buildWaiverReminderEmail();

  const result = await sendTournamentCaptainEmails({
    tournamentId: loaded.tournament.id,
    tournamentSlug: loaded.tournament.slug,
    tournamentName: loaded.tournament.name,
    tournamentDateDisplay: formatTournamentDateDisplay(loaded.tournament.date),
    tournamentLocation: loaded.tournament.location,
    sentByUserId: loaded.user.id,
    kind: "waiver_reminder",
    audience,
    subject: template.subject,
    body: template.body,
    recipientResult,
    ctaTab: "waiver",
    ctaLabel: "Complete waivers",
  });

  if ("error" in result) return result;

  try {
    await notifyCaptainsOfTournamentMessage({
      recipients: recipientResult.recipients,
      tournamentId: loaded.tournament.id,
      tournamentSlug: loaded.tournament.slug,
      tournamentName: loaded.tournament.name,
      subject: template.subject,
    });
  } catch {
    // Email already sent; in-app copy is best-effort.
  }

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/notifications");
  return {
    success: true as const,
    recipientCount: result.recipientCount,
    skippedNoCaptainCount: result.skippedNoCaptainCount,
  };
}

const postingSchema = z.object({
  regions: z
    .array(z.string())
    .min(1)
    .transform((values) => values.filter(isTeamRegion)),
  subject: z.string().trim().min(1).max(POSTING_ANNOUNCEMENT_SUBJECT_MAX),
  body: z.string().trim().min(1).max(POSTING_ANNOUNCEMENT_BODY_MAX),
  sendEmail: z.boolean(),
});

export async function previewMatchingCaptainRecipients(
  tournamentId: string,
  regions: string[]
) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;

  const selected = regions.filter(isTeamRegion);
  if (selected.length === 0) {
    return {
      success: true as const,
      recipientCount: 0,
      skippedNoCaptainCount: 0,
      skippedNoCaptainTeamNames: [] as string[],
    };
  }

  const result = await resolveMatchingCaptainRecipients({
    tournamentId: loaded.tournament.id,
    gender: loaded.tournament.gender,
    regions: selected,
    excludeUserId: loaded.user.id,
  });

  return {
    success: true as const,
    recipientCount: result.recipients.length,
    skippedNoCaptainCount: result.skippedNoCaptainCount,
    skippedNoCaptainTeamNames: result.skippedNoCaptainTeamNames,
  };
}

export async function sendMatchingCaptainAnnouncement(
  tournamentId: string,
  input: {
    regions: string[];
    subject: string;
    body: string;
    sendEmail: boolean;
  }
) {
  const loaded = await loadOrganizerTournament(tournamentId);
  if ("error" in loaded) return loaded;

  if (!isTournamentPublishedForPublic(loaded.tournament)) {
    return {
      error:
        "Publish the tournament (open registration) before notifying matching captains.",
    };
  }

  const parsed = postingSchema.safeParse(input);
  if (!parsed.success || parsed.data.regions.length === 0) {
    return {
      error: "Select at least one region and include a subject and message.",
    };
  }

  const contentError = await flagBlockedContent(loaded.user.id, [
    { area: "tournament.posting_subject", text: parsed.data.subject },
    { area: "tournament.posting_body", text: parsed.data.body },
  ]);
  if (contentError) return { error: contentError };

  const result = await sendTournamentPostingAnnouncement({
    tournament: loaded.tournament,
    sentByUserId: loaded.user.id,
    regions: parsed.data.regions,
    subject: parsed.data.subject,
    body: parsed.data.body,
    sendEmail: parsed.data.sendEmail,
  });

  if ("error" in result) return result;

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/notifications");
  return result;
}
