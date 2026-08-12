"use client";

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

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SetRealtimeRow {
  match_id?: string;
  set_number?: number;
  team_a_score?: number;
  team_b_score?: number;
}

interface MatchRealtimeRow {
  tournament_id?: string;
  status?: "upcoming" | "in_progress" | "completed";
}

const REALTIME_FILTER_CHUNK_SIZE = 50;

export function LiveScoreViewer({
  tournamentId,
  matchIds,
}: {
  tournamentId: string;
  matchIds: string[];
}) {
  const [updates, setUpdates] = useState<
    { id: string; message: string; time: Date }[]
  >([]);

  useEffect(() => {
    const supabase = createClient();

    let channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          const newData = payload.new as MatchRealtimeRow;
          if (newData.status === "completed") {
            setUpdates((prev) => [
              {
                id: crypto.randomUUID(),
                message: "Match completed!",
                time: new Date(),
              },
              ...prev.slice(0, 19),
            ]);
          } else if (newData.status === "in_progress") {
            setUpdates((prev) => [
              {
                id: crypto.randomUUID(),
                message: "Match started",
                time: new Date(),
              },
              ...prev.slice(0, 19),
            ]);
          }
        }
      );

    for (let index = 0; index < matchIds.length; index += REALTIME_FILTER_CHUNK_SIZE) {
      const matchIdChunk = matchIds.slice(
        index,
        index + REALTIME_FILTER_CHUNK_SIZE
      );
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sets",
          filter: `match_id=in.(${matchIdChunk.join(",")})`,
        },
        (payload) => {
          const newData = payload.new as SetRealtimeRow;
          if (
            newData.set_number === undefined ||
            newData.team_a_score === undefined ||
            newData.team_b_score === undefined
          ) {
            return;
          }
          setUpdates((prev) => [
            {
              id: crypto.randomUUID(),
              message: `Set ${newData.set_number}: ${newData.team_a_score} - ${newData.team_b_score}`,
              time: new Date(),
            },
            ...prev.slice(0, 19),
          ]);
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchIds, tournamentId]);

  if (updates.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 text-success">
            <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
          </span>
          Live Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {updates.map((update) => (
            <div
              key={update.id}
              className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
            >
              <span>{update.message}</span>
              <span className="text-xs text-muted-foreground">
                {update.time.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
