"use client";

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
