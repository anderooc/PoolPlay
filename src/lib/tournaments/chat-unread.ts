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
  teams,
  tournamentChatChannels,
  tournamentChatMessages,
  tournamentChatReadCursors,
  tournaments,
  users,
} from "@/lib/db/schema";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { TournamentChatChannelKind } from "@/types";

export type ChatUnreadByChannel = Record<TournamentChatChannelKind, number>;

export type ChatMessageRow = {
  id: string;
  channelId: string;
  authorUserId: string;
  authorName: string;
  teamId: string | null;
  teamName: string | null;
  body: string;
  createdAt: Date;
  isOrganizerMessage: boolean;
};

export async function getTournamentChatUnreadCounts(
  tournamentId: string,
  userId: string,
  channels: { id: string; kind: TournamentChatChannelKind }[]
): Promise<{ total: number; byChannel: ChatUnreadByChannel }> {
  const byChannel: ChatUnreadByChannel = {
    announcements: 0,
    questions: 0,
    general: 0,
  };

  if (channels.length === 0) {
    return { total: 0, byChannel };
  }

  const channelIds = channels.map((channel) => channel.id);
  const cursors = await db
    .select({
      channelId: tournamentChatReadCursors.channelId,
      lastReadAt: tournamentChatReadCursors.lastReadAt,
    })
    .from(tournamentChatReadCursors)
    .where(
      and(
        eq(tournamentChatReadCursors.userId, userId),
        inArray(tournamentChatReadCursors.channelId, channelIds)
      )
    );

  const cursorByChannel = new Map(
    cursors.map((row) => [row.channelId, row.lastReadAt])
  );

  for (const channel of channels) {
    const lastReadAt = cursorByChannel.get(channel.id);
    const conditions = [
      eq(tournamentChatMessages.channelId, channel.id),
      eq(tournamentChatMessages.tournamentId, tournamentId),
    ];
    if (lastReadAt) {
      conditions.push(gt(tournamentChatMessages.createdAt, lastReadAt));
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tournamentChatMessages)
      .where(and(...conditions));

    const count = row?.count ?? 0;
    byChannel[channel.kind] = count;
  }

  const total = Object.values(byChannel).reduce((sum, count) => sum + count, 0);
  return { total, byChannel };
}

export async function loadRecentChatMessages(
  tournamentId: string,
  channelIds: string[],
  limitPerChannel = 50
): Promise<ChatMessageRow[]> {
  if (channelIds.length === 0) return [];

  const rows = await db
    .select({
      id: tournamentChatMessages.id,
      channelId: tournamentChatMessages.channelId,
      authorUserId: tournamentChatMessages.authorUserId,
      authorName: users.fullName,
      teamId: tournamentChatMessages.teamId,
      teamName: teams.name,
      body: tournamentChatMessages.body,
      createdAt: tournamentChatMessages.createdAt,
      organizerId: tournaments.organizerId,
    })
    .from(tournamentChatMessages)
    .innerJoin(users, eq(tournamentChatMessages.authorUserId, users.id))
    .innerJoin(tournaments, eq(tournamentChatMessages.tournamentId, tournaments.id))
    .leftJoin(teams, eq(tournamentChatMessages.teamId, teams.id))
    .where(
      and(
        eq(tournamentChatMessages.tournamentId, tournamentId),
        inArray(tournamentChatMessages.channelId, channelIds)
      )
    )
    .orderBy(desc(tournamentChatMessages.createdAt))
    .limit(limitPerChannel * channelIds.length);

  return rows.map((row) => ({
    id: row.id,
    channelId: row.channelId,
    authorUserId: row.authorUserId,
    authorName: row.authorName,
    teamId: row.teamId,
    teamName: row.teamName,
    body: row.body,
    createdAt: row.createdAt,
    isOrganizerMessage: row.authorUserId === row.organizerId,
  }));
}

export async function getChannelByKind(
  tournamentId: string,
  kind: TournamentChatChannelKind
) {
  const [channel] = await db
    .select({
      id: tournamentChatChannels.id,
      kind: tournamentChatChannels.kind,
    })
    .from(tournamentChatChannels)
    .where(
      and(
        eq(tournamentChatChannels.tournamentId, tournamentId),
        eq(tournamentChatChannels.kind, kind)
      )
    )
    .limit(1);

  return channel ?? null;
}
