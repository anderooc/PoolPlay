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
