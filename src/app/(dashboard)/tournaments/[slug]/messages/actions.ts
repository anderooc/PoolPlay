"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { flagBlockedContent } from "@/lib/admin/content-flags";
import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatTournamentDateDisplay } from "@/lib/date-iso";
import {
  audienceLabel,
  resolveCaptainEmailRecipients,
  type TournamentEmailAudience,
} from "@/lib/tournaments/email-recipients";
import {
  canEditTournamentPreparation,
  isTournamentOrganizer,
  tournamentPreparationLockedReason,
} from "@/lib/tournaments/permissions";
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

  if (!tournament || !isTournamentOrganizer(tournament, user)) {
    return { error: "Only the organizer can send tournament emails." as const };
  }

  if (!canEditTournamentPreparation(tournament, user)) {
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

  revalidatePath("/tournaments/[slug]", "page");
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

  revalidatePath("/tournaments/[slug]", "page");
  return {
    success: true as const,
    recipientCount: result.recipientCount,
    skippedNoCaptainCount: result.skippedNoCaptainCount,
  };
}
