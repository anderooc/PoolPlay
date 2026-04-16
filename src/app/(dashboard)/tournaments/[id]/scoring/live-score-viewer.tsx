"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RealtimePayload {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export function LiveScoreViewer({ tournamentId }: { tournamentId: string }) {
  const [updates, setUpdates] = useState<
    { id: string; message: string; time: Date }[]
  >([]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sets" },
        (payload: RealtimePayload) => {
          const newData = payload.new as Record<string, unknown>;
          setUpdates((prev) => [
            {
              id: crypto.randomUUID(),
              message: `Set ${newData.set_number}: ${newData.team_a_score} - ${newData.team_b_score}`,
              time: new Date(),
            },
            ...prev.slice(0, 19),
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload: RealtimePayload) => {
          const newData = payload.new as Record<string, unknown>;
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  if (updates.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
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
