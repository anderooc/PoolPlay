"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getTournamentQuestionsChannelId } from "./chat/actions";

type RealtimeMessagePayload = {
  new: {
    id: string;
    channel_id: string;
    author_user_id: string;
    body: string;
  };
};

export function TournamentChatNotifier({ tournamentId }: { tournamentId: string }) {
  const [questionsChannelId, setQuestionsChannelId] = useState<string | null>(
    null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getTournamentQuestionsChannelId(tournamentId).then((result) => {
      if (cancelled) return;
      if ("success" in result && result.success) {
        setQuestionsChannelId(result.channelId);
        setCurrentUserId(result.currentUserId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!questionsChannelId || !currentUserId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`tournament-chat-notify-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tournament_chat_messages",
          filter: `channel_id=eq.${questionsChannelId}`,
        },
        (payload: RealtimeMessagePayload) => {
          const row = payload.new;
          if (!row || row.author_user_id === currentUserId) return;

          const preview =
            row.body.length > 120 ? `${row.body.slice(0, 117)}…` : row.body;
          toast("New tournament question", { description: preview });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, questionsChannelId, tournamentId]);

  return null;
}
