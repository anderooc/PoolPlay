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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";
import { format as formatDate } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseISODate } from "@/lib/date-iso";
import { cn } from "@/lib/utils";
import { updateMatchScheduledTime } from "./actions";

type Meridiem = "AM" | "PM";

interface ClockEntry {
  hour: string;
  minute: string;
  meridiem: Meridiem;
}

function minutesToLabel(totalMinutes: number): string {
  const base = new Date(2000, 0, 1, 0, 0, 0, 0);
  base.setMinutes(totalMinutes);
  return formatDate(base, "h:mm a");
}

/** Local time-of-day (minutes since midnight) for an existing ISO timestamp. */
function isoToMinutes(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

/** Split minutes-since-midnight into 12-hour clock fields for the entry form. */
function minutesToEntry(totalMinutes: number | null): ClockEntry {
  if (totalMinutes == null) return { hour: "", minute: "", meridiem: "AM" };
  const h24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const meridiem: Meridiem = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    hour: String(hour12),
    minute: String(minute).padStart(2, "0"),
    meridiem,
  };
}

/**
 * Validate typed clock fields and return minutes-since-midnight, or an error.
 * Hours 0 and 13–23 are accepted as 24-hour input (the AM/PM toggle is ignored
 * for those); 1–12 use the toggle. Minute is 0–59; both fields are required.
 */
function validateEntry(entry: ClockEntry): { minutes: number } | { error: string } {
  if (entry.hour.trim() === "" || entry.minute.trim() === "") {
    return { error: "Enter an hour and minute." };
  }
  if (!/^\d{1,2}$/.test(entry.hour) || !/^\d{1,2}$/.test(entry.minute)) {
    return { error: "Use numbers only." };
  }
  const hour = Number(entry.hour);
  const minute = Number(entry.minute);
  if (hour < 0 || hour > 23) return { error: "Hour must be 0–23." };
  if (minute < 0 || minute > 59) return { error: "Minute must be 00–59." };
  const h24 =
    hour === 0 || hour > 12
      ? hour
      : entry.meridiem === "PM"
        ? hour === 12
          ? 12
          : hour + 12
        : hour === 12
          ? 0
          : hour;
  return { minutes: h24 * 60 + minute };
}

/** Fold a typed 24-hour entry (0, 13–23) into its analog 12-hour display. */
function normalizeHourDisplay(entry: ClockEntry): ClockEntry {
  if (!/^\d{1,2}$/.test(entry.hour)) return entry;
  const hour = Number(entry.hour);
  if (hour === 0) return { ...entry, hour: "12", meridiem: "AM" };
  if (hour > 12 && hour <= 23)
    return { ...entry, hour: String(hour - 12), meridiem: "PM" };
  return entry;
}

/**
 * Inline host control for editing a match's planned start time. Matches happen
 * on the tournament's single date, so this only sets a time of day (no
 * calendar) via a typed digital-clock entry with validation.
 */
export function MatchStartTimeEditor({
  matchId,
  scheduledTime,
  tournamentDate,
  triggerLabel = "Set start time",
}: {
  matchId: string;
  scheduledTime: string | null;
  /** YYYY-MM-DD — anchors the chosen time when no start time exists yet. */
  tournamentDate: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMinutes = isoToMinutes(scheduledTime);
  const [entry, setEntry] = useState<ClockEntry>(() =>
    minutesToEntry(selectedMinutes)
  );

  // Reset the form to the current value whenever the popover opens.
  useEffect(() => {
    if (open) {
      setEntry(minutesToEntry(selectedMinutes));
      setError(null);
    }
  }, [open, selectedMinutes]);

  /** Combine the anchor date (existing day or tournament date) with a time. */
  function buildIso(totalMinutes: number): string {
    const anchor = scheduledTime ? new Date(scheduledTime) : null;
    const base =
      anchor && !Number.isNaN(anchor.getTime())
        ? anchor
        : parseISODate(tournamentDate);
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Math.floor(totalMinutes / 60),
      totalMinutes % 60,
      0,
      0
    );
    return next.toISOString();
  }

  async function persist(iso: string | null) {
    setBusy(true);
    const result = await updateMatchScheduledTime(matchId, iso);
    setBusy(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(iso ? "Start time updated" : "Start time cleared");
    setOpen(false);
    router.refresh();
  }

  function handleSave() {
    const parsed = validateEntry(entry);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    void persist(buildIso(parsed.minutes));
  }

  const hasTime = selectedMinutes != null;
  const displayLabel = hasTime ? minutesToLabel(selectedMinutes) : triggerLabel;

  const segmentClass =
    "w-12 rounded-md border bg-background py-1.5 text-center text-2xl font-semibold tabular-nums tracking-tight outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-1 rounded underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50",
              !hasTime && "italic",
              open && "text-foreground underline"
            )}
          />
        }
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{displayLabel}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-3 p-3">
        <PopoverHeader className="flex-row items-center justify-between gap-2">
          <PopoverTitle className="text-sm">Start time</PopoverTitle>
          {selectedMinutes != null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => persist(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </PopoverHeader>

        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Hour"
            placeholder="--"
            maxLength={2}
            value={entry.hour}
            disabled={busy}
            onChange={(e) => {
              setError(null);
              setEntry((p) => ({
                ...p,
                hour: e.target.value.replace(/\D/g, "").slice(0, 2),
              }));
            }}
            onBlur={() => setEntry((p) => normalizeHourDisplay(p))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className={segmentClass}
          />
          <span className="text-2xl font-semibold text-muted-foreground">
            :
          </span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Minute"
            placeholder="--"
            maxLength={2}
            value={entry.minute}
            disabled={busy}
            onChange={(e) => {
              setError(null);
              setEntry((p) => ({
                ...p,
                minute: e.target.value.replace(/\D/g, "").slice(0, 2),
              }));
            }}
            onBlur={() =>
              setEntry((p) => ({
                ...p,
                minute:
                  p.minute === "" ? "" : p.minute.padStart(2, "0"),
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className={segmentClass}
          />
          <div className="ml-1 flex flex-col gap-1">
            {(["AM", "PM"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setEntry((p) => ({ ...p, meridiem: m }));
                }}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-semibold transition-colors disabled:opacity-50",
                  entry.meridiem === m
                    ? "bg-primary text-primary-foreground"
                    : "border text-muted-foreground hover:bg-muted"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={handleSave}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
