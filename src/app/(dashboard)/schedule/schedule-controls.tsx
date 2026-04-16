"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { autoScheduleTournament } from "./actions";

export function ScheduleControls({
  tournaments,
}: {
  tournaments: { id: string; name: string }[];
}) {
  const [tournamentId, setTournamentId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSchedule() {
    if (!tournamentId || !startTime) {
      setError("Select a tournament and start time");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const res = await autoScheduleTournament(tournamentId, startTime, duration);
    if (res?.error) {
      setError(res.error);
    } else {
      setResult(`Scheduled ${res.scheduled} matches`);
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Auto-Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label>Tournament</Label>
            <Select value={tournamentId} onValueChange={(v) => setTournamentId(v ?? "")}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select tournament" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="duration">Match Length (min)</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              max={120}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-24"
            />
          </div>
          <Button onClick={handleSchedule} disabled={loading}>
            {loading ? "Scheduling..." : "Schedule Matches"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        {result && <p className="mt-2 text-sm text-green-600">{result}</p>}
      </CardContent>
    </Card>
  );
}
