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

import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { tournamentPostingAnnouncements } from "@/lib/db/schema";
import { formatTournamentDateDisplay } from "@/lib/date-iso";
import { createUserNotifications } from "@/lib/notifications/store";
import { resolveMatchingCaptainRecipients } from "@/lib/tournaments/matching-captains";
import {
  POSTING_ANNOUNCEMENT_WEEKLY_LIMIT,
  uniqueRegions,
} from "@/lib/tournaments/posting-announcement-copy";
import { isTournamentPublishedForPublic } from "@/lib/tournaments/permissions";
import {
  buildCaptainEmailHtml,
  buildCaptainEmailText,
  formatCaptainTeamLabels,
  formatTournamentEmailSubject,
  getResendClient,
  tournamentEmailFromAddress,
  tournamentPageUrl,
} from "@/lib/email/resend";
import type { CaptainEmailRecipient } from "@/lib/tournaments/email-recipients";
import type { TeamGender, TeamRegion, TournamentStatus } from "@/types";

export {
  POSTING_ANNOUNCEMENT_BODY_MAX,
  POSTING_ANNOUNCEMENT_SUBJECT_MAX,
  POSTING_ANNOUNCEMENT_WEEKLY_LIMIT,
} from "@/lib/tournaments/posting-announcement-copy";

type TournamentForPosting = {
  id: string;
  slug: string;
  name: string;
  date: string;
  location: string;
  status: TournamentStatus | string;
  gender: TeamGender;
  region: TeamRegion;
};

export async function countRecentPostingAnnouncements(
  tournamentId: string
): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: tournamentPostingAnnouncements.id })
    .from(tournamentPostingAnnouncements)
    .where(
      and(
        eq(tournamentPostingAnnouncements.tournamentId, tournamentId),
        gte(tournamentPostingAnnouncements.sentAt, since)
      )
    );
  return rows.length;
}

export async function listRecentPostingAnnouncements(
  tournamentId: string,
  limit = 10
) {
  return db
    .select({
      id: tournamentPostingAnnouncements.id,
      subject: tournamentPostingAnnouncements.subject,
      recipientCount: tournamentPostingAnnouncements.recipientCount,
      skippedNoCaptainCount: tournamentPostingAnnouncements.skippedNoCaptainCount,
      sendEmail: tournamentPostingAnnouncements.sendEmail,
      regions: tournamentPostingAnnouncements.regions,
      sentAt: tournamentPostingAnnouncements.sentAt,
    })
    .from(tournamentPostingAnnouncements)
    .where(eq(tournamentPostingAnnouncements.tournamentId, tournamentId))
    .orderBy(desc(tournamentPostingAnnouncements.sentAt))
    .limit(limit);
}

async function sendAnnouncementEmail(
  recipient: CaptainEmailRecipient,
  input: {
    tournamentName: string;
    tournamentSlug: string;
    dateDisplay: string;
    location: string;
    subject: string;
    body: string;
  }
): Promise<void> {
  const resend = getResendClient();
  const personalizedBody = input.body
    .replaceAll("{{captainName}}", recipient.fullName)
    .replaceAll("{{teamName}}", recipient.teamNames[0] ?? "your team")
    .replaceAll("{{teamNames}}", recipient.teamNames.join(", "));
  const ctaUrl = tournamentPageUrl(input.tournamentSlug);
  const emailContext = {
    body: personalizedBody,
    tournamentName: input.tournamentName,
    dateDisplay: input.dateDisplay,
    location: input.location,
    teamLabels: formatCaptainTeamLabels(recipient),
    ctaUrl,
    ctaLabel: "View tournament",
    footerReason:
      "You received this because you captain a team that matches this tournament's gender and region on brackt.",
  };

  const { error } = await resend.emails.send({
    from: tournamentEmailFromAddress(),
    to: recipient.email,
    subject: formatTournamentEmailSubject(input.tournamentName, input.subject),
    html: buildCaptainEmailHtml(emailContext),
    text: buildCaptainEmailText(emailContext),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendTournamentPostingAnnouncement(input: {
  tournament: TournamentForPosting;
  sentByUserId: string;
  regions: TeamRegion[];
  subject: string;
  body: string;
  sendEmail: boolean;
}): Promise<
  | {
      success: true;
      recipientCount: number;
      skippedNoCaptainCount: number;
      emailSent: boolean;
      emailError?: string;
    }
  | { error: string }
> {
  if (!isTournamentPublishedForPublic(input.tournament)) {
    return {
      error:
        "Publish the tournament (open registration) before notifying matching captains.",
    };
  }

  const regions = uniqueRegions(input.regions);
  if (regions.length === 0) {
    return { error: "Select at least one region." };
  }

  const recent = await countRecentPostingAnnouncements(input.tournament.id);
  if (recent >= POSTING_ANNOUNCEMENT_WEEKLY_LIMIT) {
    return {
      error: `Posting announcements are limited to ${POSTING_ANNOUNCEMENT_WEEKLY_LIMIT} per tournament per 7 days.`,
    };
  }

  const recipientResult = await resolveMatchingCaptainRecipients({
    tournamentId: input.tournament.id,
    gender: input.tournament.gender,
    regions,
    excludeUserId: input.sentByUserId,
  });

  if (recipientResult.recipients.length === 0) {
    return {
      error:
        recipientResult.skippedNoCaptainCount > 0
          ? "Matching teams were found, but none have a captain assigned."
          : "No matching captains found for this gender and region filter.",
    };
  }

  const dateDisplay = formatTournamentDateDisplay(input.tournament.date);
  const href = `/tournaments/${input.tournament.slug}`;
  await createUserNotifications(
    recipientResult.recipients.map((recipient) => ({
      userId: recipient.userId,
      kind: "tournament_posted",
      title: `${input.tournament.name} is open`,
      body: `${dateDisplay} · ${input.tournament.location}`,
      href,
      tournamentId: input.tournament.id,
    }))
  );

  let emailSent = false;
  let emailError: string | undefined;
  if (input.sendEmail) {
    if (!process.env.RESEND_API_KEY) {
      emailError =
        "In-app notifications were sent. Email is not configured in this environment.";
    } else {
      try {
        for (const recipient of recipientResult.recipients) {
          await sendAnnouncementEmail(recipient, {
            tournamentName: input.tournament.name,
            tournamentSlug: input.tournament.slug,
            dateDisplay,
            location: input.tournament.location,
            subject: input.subject,
            body: input.body,
          });
        }
        emailSent = true;
      } catch (error) {
        emailError =
          error instanceof Error
            ? `In-app notifications were sent, but email failed: ${error.message}`
            : "In-app notifications were sent, but email failed.";
      }
    }
  }

  await db.insert(tournamentPostingAnnouncements).values({
    tournamentId: input.tournament.id,
    sentByUserId: input.sentByUserId,
    subject: input.subject,
    body: input.body,
    gender: input.tournament.gender,
    regions,
    sendEmail: input.sendEmail,
    recipientCount: recipientResult.recipients.length,
    skippedNoCaptainCount: recipientResult.skippedNoCaptainCount,
  });

  return {
    success: true,
    recipientCount: recipientResult.recipients.length,
    skippedNoCaptainCount: recipientResult.skippedNoCaptainCount,
    emailSent,
    emailError,
  };
}
