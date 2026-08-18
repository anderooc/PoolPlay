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

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { registrations, teamMembers } from "@/lib/db/schema";
import { createUserNotifications } from "@/lib/notifications/store";
import type { CaptainEmailRecipient } from "@/lib/tournaments/email-recipients";
import type { UserNotificationKind } from "@/types";

export async function notifyCaptainsOfTournamentMessage(input: {
  recipients: CaptainEmailRecipient[];
  tournamentId: string;
  tournamentSlug: string;
  tournamentName: string;
  subject: string;
}): Promise<void> {
  await createUserNotifications(
    input.recipients.map((recipient) => ({
      userId: recipient.userId,
      kind: "tournament_message" satisfies UserNotificationKind,
      title: input.tournamentName,
      body: input.subject,
      href: `/tournaments/${input.tournamentSlug}`,
      tournamentId: input.tournamentId,
    }))
  );
}

export async function notifyRegisteredCaptainsOfChatAnnouncement(input: {
  tournamentId: string;
  tournamentSlug: string;
  tournamentName: string;
  body: string;
  excludeUserId: string;
}): Promise<void> {
  const registrationRows = await db
    .select({ teamId: registrations.teamId })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, input.tournamentId),
        inArray(registrations.status, ["confirmed", "checked_in"])
      )
    );

  const teamIds = [...new Set(registrationRows.map((row) => row.teamId))];
  if (teamIds.length === 0) return;

  const captains = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(
      and(inArray(teamMembers.teamId, teamIds), eq(teamMembers.role, "captain"))
    );

  const uniqueUserIds = [
    ...new Set(
      captains
        .map((row) => row.userId)
        .filter((userId) => userId !== input.excludeUserId)
    ),
  ];

  const preview = input.body.trim().replace(/\s+/g, " ").slice(0, 140);

  await createUserNotifications(
    uniqueUserIds.map((userId) => ({
      userId,
      kind: "chat_announcement",
      title: `Announcement · ${input.tournamentName}`,
      body: preview,
      href: `/tournaments/${input.tournamentSlug}?tab=chat`,
      tournamentId: input.tournamentId,
    }))
  );
}

export async function notifyTeamCaptainsOfRegistrationUpdate(input: {
  teamIds: string[];
  tournamentId: string;
  tournamentSlug: string;
  tournamentName: string;
  status: "pending" | "confirmed" | "checked_in";
}): Promise<void> {
  const teamIds = [...new Set(input.teamIds)];
  if (teamIds.length === 0) return;

  const captains = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(
      and(inArray(teamMembers.teamId, teamIds), eq(teamMembers.role, "captain"))
    );

  const statusLabel =
    input.status === "confirmed"
      ? "Registration confirmed"
      : input.status === "checked_in"
        ? "Checked in"
        : "Registration moved back to pending";

  const uniqueUserIds = [...new Set(captains.map((row) => row.userId))];

  await createUserNotifications(
    uniqueUserIds.map((userId) => ({
      userId,
      kind: "registration_update",
      title: input.tournamentName,
      body: statusLabel,
      href: `/tournaments/${input.tournamentSlug}?tab=teams`,
      tournamentId: input.tournamentId,
    }))
  );
}
