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
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Auto-schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="tournament">Tournament</Label>
            <Select
              value={tournamentId}
              onValueChange={(v) => setTournamentId(v ?? "")}
            >
              <SelectTrigger id="tournament" className="w-full">
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
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="startTime">Start time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Match length (min)</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              max={120}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSchedule}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Scheduling…" : "Schedule matches"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Warmup time is reserved automatically based on the tournament&apos;s
          match format.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {result ? <p className="text-sm text-success">{result}</p> : null}
      </CardContent>
    </Card>
  );
}
