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

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format as formatDate } from "date-fns";
import { ChevronDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MATCH_INTERVAL_MINUTES,
  MAX_MATCH_INTERVAL_MINUTES,
  MIN_MATCH_INTERVAL_MINUTES,
  clampMatchIntervalMinutes,
  fillableCount,
  proposeMatchTimeFill,
  type MatchTimeFillInput,
  type MatchTimeFillRow,
} from "@/lib/utils/match-time-fill";
import type { ScheduleTimesGroupDTO } from "@/lib/utils/schedule-times-groups";
import { applyMatchTimeFill } from "./fill-actions";
import {
  isoFromClockMinutes,
  isoToMinutes,
  minutesToEntry,
  validateClockEntry,
  StartTimeClockFields,
  type ClockEntry,
} from "./start-time-clock";

function dtoToInputs(
  matches: ScheduleTimesGroupDTO["matches"]
): MatchTimeFillInput[] {
  return matches.map((match) => ({
    ...match,
    scheduledTime: match.scheduledTime ? new Date(match.scheduledTime) : null,
  }));
}

function timeLabel(iso: string): string {
  return formatDate(new Date(iso), "h:mm a");
}

function earliestScheduledIso(group: ScheduleTimesGroupDTO): string | null {
  let earliest: string | null = null;
  let earliestMs = Number.POSITIVE_INFINITY;
  for (const match of group.matches) {
    if (!match.scheduledTime || match.isBye) continue;
    const ms = new Date(match.scheduledTime).getTime();
    if (Number.isNaN(ms) || ms >= earliestMs) continue;
    earliestMs = ms;
    earliest = match.scheduledTime;
  }
  return earliest;
}

function scheduledCount(group: ScheduleTimesGroupDTO): {
  scheduled: number;
  total: number;
} {
  const playable = group.matches.filter((match) => !match.isBye);
  return {
    total: playable.length,
    scheduled: playable.filter((match) => match.scheduledTime).length,
  };
}

function rowNote(row: MatchTimeFillRow): string | null {
  if (row.kind === "locked") return "Completed or in progress, skipped";
  if (row.kind === "keep" && row.currentIso) {
    return `Keeping ${timeLabel(row.currentIso)}`;
  }
  return null;
}

export function ScheduleMatchTimesSection({
  tournamentId,
  tournamentDate,
  groups,
}: {
  tournamentId: string;
  tournamentDate: string;
  groups: ScheduleTimesGroupDTO[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [interval, setInterval] = useState(DEFAULT_MATCH_INTERVAL_MINUTES);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);
  const selectedGroup =
    groups.find((group) => group.id === groupId) ?? groups[0] ?? null;
  const [entry, setEntry] = useState<ClockEntry>(() =>
    minutesToEntry(isoToMinutes(selectedGroup ? earliestScheduledIso(selectedGroup) : null))
  );

  const counts = selectedGroup ? scheduledCount(selectedGroup) : null;
  const rows = useMemo(() => {
    if (!selectedGroup) return [];
    const parsed = validateClockEntry(entry);
    if ("error" in parsed) return [];
    const firstStart = new Date(
      isoFromClockMinutes(tournamentDate, parsed.minutes)
    );
    return proposeMatchTimeFill({
      matches: dtoToInputs(selectedGroup.matches),
      firstStart,
      intervalMinutes: interval,
      overwrite,
    });
  }, [selectedGroup, entry, interval, overwrite, tournamentDate]);

  const applyCount = fillableCount(rows);
  const waves = useMemo(() => {
    const byWave = new Map<number, { time: string; rows: MatchTimeFillRow[] }>();
    for (const row of rows) {
      const existing = byWave.get(row.wave);
      if (existing) existing.rows.push(row);
      else byWave.set(row.wave, { time: row.proposedIso, rows: [row] });
    }
    return [...byWave.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, value]) => value);
  }, [rows]);

  if (groups.length === 0) return null;

  function selectGroup(nextId: string) {
    const next = groups.find((group) => group.id === nextId);
    setGroupId(nextId);
    setClockError(null);
    setEntry(
      minutesToEntry(isoToMinutes(next ? earliestScheduledIso(next) : null))
    );
  }

  async function handleApply() {
    if (!selectedGroup) return;
    const parsed = validateClockEntry(entry);
    if ("error" in parsed) {
      setClockError(parsed.error);
      return;
    }
    setClockError(null);
    if (applyCount === 0) return;
    setBusy(true);
    const result = await applyMatchTimeFill(
      tournamentId,
      selectedGroup.scope,
      isoFromClockMinutes(tournamentDate, parsed.minutes),
      clampMatchIntervalMinutes(interval),
      overwrite
    );
    setBusy(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.updated === 1
        ? "Updated 1 start time"
        : `Updated ${result.updated} start times`
    );
    router.refresh();
  }

  const summary =
    counts == null
      ? "No matches yet"
      : counts.scheduled === 0
        ? `${counts.total} match${counts.total === 1 ? "" : "es"} with no start times`
        : `${counts.scheduled} of ${counts.total} matches have a start time`;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Clock
            className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 sm:block"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Schedule times</p>
            <p className="text-xs text-muted-foreground">{summary}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-sm"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Close" : "Set times"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-150",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </Button>
      </div>

      {open && selectedGroup ? (
        <div className="mt-3 space-y-4 border-t border-border/40 pt-3">
          <p className="text-sm text-muted-foreground">
            Set the first start time and gap. Parallel matches on other courts
            get the same time.
          </p>

          {groups.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="schedule-group">Matches</Label>
              <Select value={groupId} onValueChange={(value) => selectGroup(String(value ?? ""))}>
                <SelectTrigger id="schedule-group" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>First start time</Label>
            <StartTimeClockFields
              idPrefix="schedule-start"
              entry={entry}
              disabled={busy}
              error={clockError}
              onChange={(next) => {
                setClockError(null);
                setEntry(next);
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-interval">Minutes between matches</Label>
              <Input
                id="schedule-interval"
                type="number"
                min={MIN_MATCH_INTERVAL_MINUTES}
                max={MAX_MATCH_INTERVAL_MINUTES}
                step={5}
                value={interval}
                disabled={busy}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  setInterval(next);
                }}
                onBlur={() =>
                  setInterval(clampMatchIntervalMinutes(interval))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2">
              <Label htmlFor="schedule-overwrite" className="text-sm font-medium">
                Overwrite existing times
              </Label>
              <Switch
                id="schedule-overwrite"
                checked={overwrite}
                disabled={busy}
                onCheckedChange={setOverwrite}
              />
            </div>
          </div>

          {rows.some((row) => row.kind === "locked") && (
            <p className="text-xs text-muted-foreground">
              Completed and in-progress matches stay as they are.
            </p>
          )}

          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {waves.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Enter a first start time to preview the schedule.
              </p>
            ) : (
              waves.map((wave) => (
                <section key={wave.time} className="space-y-1.5">
                  <h3 className="text-sm font-semibold tabular-nums">
                    {timeLabel(wave.time)}
                  </h3>
                  <ul className="space-y-1">
                    {wave.rows.map((row) => {
                      const note = rowNote(row);
                      return (
                        <li
                          key={row.matchId}
                          className={
                            row.kind === "apply"
                              ? "text-sm"
                              : "text-sm text-muted-foreground"
                          }
                        >
                          <span className="font-medium">{row.groupName}</span>
                          <span className="text-muted-foreground"> · </span>
                          {row.label}
                          {note ? (
                            <span className="block text-xs text-muted-foreground">
                              {note}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={busy || applyCount === 0}
              onClick={() => void handleApply()}
            >
              {busy
                ? "Updating…"
                : applyCount === 0
                  ? "Nothing to update"
                  : applyCount === 1
                    ? "Apply 1 time"
                    : `Apply ${applyCount} times`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
