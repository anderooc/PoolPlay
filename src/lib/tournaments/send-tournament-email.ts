import { db } from "@/lib/db";
import { tournamentEmailSends } from "@/lib/db/schema";
import { and, eq, gte } from "drizzle-orm";
import {
  buildCaptainEmailHtml,
  buildCaptainEmailText,
  formatCaptainTeamLabels,
  formatTournamentEmailSubject,
  getResendClient,
  tournamentEmailFromAddress,
  tournamentPageUrl,
} from "@/lib/email/resend";
import type {
  CaptainEmailRecipient,
  CaptainRecipientResult,
  TournamentEmailAudience,
} from "@/lib/tournaments/email-recipients";

export const TOURNAMENT_EMAIL_SUBJECT_MAX = 200;
export const TOURNAMENT_EMAIL_BODY_MAX = 10000;
export const TOURNAMENT_EMAIL_DAILY_LIMIT = 5;

export type TournamentEmailKind = "custom" | "waiver_reminder";

export type SendTournamentEmailInput = {
  tournamentId: string;
  tournamentSlug: string;
  tournamentName: string;
  tournamentDateDisplay: string;
  tournamentLocation: string;
  sentByUserId: string;
  kind: TournamentEmailKind;
  audience: TournamentEmailAudience;
  subject: string;
  body: string;
  recipientResult: CaptainRecipientResult;
  ctaTab?: string;
  ctaLabel?: string;
};

export async function countTournamentEmailsSentToday(
  tournamentId: string
): Promise<number> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const rows = await db
    .select({ id: tournamentEmailSends.id })
    .from(tournamentEmailSends)
    .where(
      and(
        eq(tournamentEmailSends.tournamentId, tournamentId),
        gte(tournamentEmailSends.sentAt, since)
      )
    );

  return rows.length;
}

async function sendToRecipient(
  recipient: CaptainEmailRecipient,
  input: SendTournamentEmailInput
): Promise<void> {
  const resend = getResendClient();
  const ctaUrl = input.ctaTab
    ? tournamentPageUrl(input.tournamentSlug, input.ctaTab)
    : tournamentPageUrl(input.tournamentSlug);
  const teamLabels = formatCaptainTeamLabels(recipient);
  const personalizedBody = personalizeBody(input.body, recipient);
  const emailContext = {
    body: personalizedBody,
    tournamentName: input.tournamentName,
    dateDisplay: input.tournamentDateDisplay,
    location: input.tournamentLocation,
    teamLabels,
    ctaUrl,
    ctaLabel: input.ctaLabel ?? "View tournament",
  };

  const html = buildCaptainEmailHtml(emailContext);
  const text = buildCaptainEmailText(emailContext);
  const subject = formatTournamentEmailSubject(
    input.tournamentName,
    personalizeSubject(input.subject, recipient)
  );

  const { error } = await resend.emails.send({
    from: tournamentEmailFromAddress(),
    to: recipient.email,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function personalizeSubject(
  subject: string,
  recipient: CaptainEmailRecipient
): string {
  return subject
    .replaceAll("{{teamName}}", recipient.teamNames[0] ?? "your team")
    .replaceAll("{{teamNames}}", recipient.teamNames.join(", "));
}

function personalizeBody(body: string, recipient: CaptainEmailRecipient): string {
  return body
    .replaceAll("{{captainName}}", recipient.fullName)
    .replaceAll("{{teamName}}", recipient.teamNames[0] ?? "your team")
    .replaceAll("{{teamNames}}", recipient.teamNames.join(", "));
}

export async function sendTournamentCaptainEmails(
  input: SendTournamentEmailInput
): Promise<
  | { success: true; recipientCount: number; skippedNoCaptainCount: number }
  | { error: string }
> {
  const { recipients, skippedNoCaptainCount } = input.recipientResult;

  if (recipients.length === 0) {
    return {
      error:
        skippedNoCaptainCount > 0
          ? "No captains found for the selected teams. Assign a captain on each team roster first."
          : "No recipients match this audience.",
    };
  }

  const sentToday = await countTournamentEmailsSentToday(input.tournamentId);
  if (sentToday >= TOURNAMENT_EMAIL_DAILY_LIMIT) {
    return {
      error: `Daily email limit reached (${TOURNAMENT_EMAIL_DAILY_LIMIT} sends per tournament per 24 hours).`,
    };
  }

  try {
    for (const recipient of recipients) {
      await sendToRecipient(recipient, input);
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to send one or more emails.",
    };
  }

  await db.insert(tournamentEmailSends).values({
    tournamentId: input.tournamentId,
    sentByUserId: input.sentByUserId,
    kind: input.kind,
    audience: input.audience,
    subject: input.subject,
    body: input.body,
    recipientCount: recipients.length,
    skippedNoCaptainCount,
  });

  return {
    success: true,
    recipientCount: recipients.length,
    skippedNoCaptainCount,
  };
}

export function buildWaiverReminderEmail(): { subject: string; body: string } {
  return {
    subject: "Action needed: complete your team waiver",
    body: `Hi,

This is a reminder to complete the tournament waiver before check-in.

Your team still has roster members who have not completed the waiver. You can mark offline signatures in PoolPlay, or players can acknowledge digitally if allowed.

Thank you,
Tournament staff`,
  };
}
