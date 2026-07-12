/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import {
  TOURNAMENT_CHAT_CHANNEL_DESCRIPTIONS,
  TOURNAMENT_CHAT_CHANNEL_KINDS,
  TOURNAMENT_CHAT_CHANNEL_LABELS,
} from "@/lib/tournaments/chat-access";
import {
  getTournamentChatUnreadCounts,
  loadRecentChatMessages,
  type ChatMessageRow,
} from "@/lib/tournaments/chat-unread";
import type { TournamentChatChannelKind } from "@/types";
import { ensureTournamentChatForPage } from "../chat/actions";
import { TournamentChatPanel } from "../chat-panel";

export async function TournamentChatTabPanel({
  tournamentId,
  tournamentStatus,
  organizerId,
}: {
  tournamentId: string;
  tournamentStatus: string;
  organizerId: string;
}) {
  const loaded = await ensureTournamentChatForPage(tournamentId);
  if ("error" in loaded) {
    return <p className="text-sm text-muted-foreground">{loaded.error}</p>;
  }

  const channels = [...loaded.channels].sort(
    (a, b) =>
      TOURNAMENT_CHAT_CHANNEL_KINDS.indexOf(a.kind) -
      TOURNAMENT_CHAT_CHANNEL_KINDS.indexOf(b.kind)
  );

  const channelIds = channels.map((channel) => channel.id);
  const allMessages = await loadRecentChatMessages(tournamentId, channelIds);
  const messagesByChannel: Record<string, ChatMessageRow[]> = {};
  for (const channel of channels) {
    messagesByChannel[channel.id] = allMessages
      .filter((message) => message.channelId === channel.id)
      .sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      )
      .slice(-50);
  }

  const unread = await getTournamentChatUnreadCounts(
    tournamentId,
    loaded.user.id,
    channels
  );

  return (
    <TournamentChatPanel
      tournamentId={tournamentId}
      tournamentStatus={tournamentStatus}
      organizerId={organizerId}
      currentUserId={loaded.user.id}
      isOrganizer={loaded.isOrganizer}
      canPost={loaded.canPost}
      eligibleTeams={loaded.eligibleTeams}
      channels={channels.map((channel) => {
        const kind = channel.kind;
        return {
          id: channel.id,
          kind,
          label: TOURNAMENT_CHAT_CHANNEL_LABELS[kind],
          description: TOURNAMENT_CHAT_CHANNEL_DESCRIPTIONS[kind],
          unreadCount: unread.byChannel[kind],
        };
      })}
      messagesByChannel={messagesByChannel}
      totalUnread={unread.total}
    />
  );
}
