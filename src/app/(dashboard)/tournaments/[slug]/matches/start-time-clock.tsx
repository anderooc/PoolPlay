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

import { format as formatDate } from "date-fns";
import { cn } from "@/lib/utils";
import { parseISODate } from "@/lib/date-iso";

export type Meridiem = "AM" | "PM";

export interface ClockEntry {
  hour: string;
  minute: string;
  meridiem: Meridiem;
}

export function minutesToLabel(totalMinutes: number): string {
  const base = new Date(2000, 0, 1, 0, 0, 0, 0);
  base.setMinutes(totalMinutes);
  return formatDate(base, "h:mm a");
}

/** Local time-of-day (minutes since midnight) for an existing ISO timestamp. */
export function isoToMinutes(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

/** Split minutes-since-midnight into 12-hour clock fields for the entry form. */
export function minutesToEntry(totalMinutes: number | null): ClockEntry {
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
export function validateClockEntry(
  entry: ClockEntry
): { minutes: number } | { error: string } {
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
export function normalizeHourDisplay(entry: ClockEntry): ClockEntry {
  if (!/^\d{1,2}$/.test(entry.hour)) return entry;
  const hour = Number(entry.hour);
  if (hour === 0) return { ...entry, hour: "12", meridiem: "AM" };
  if (hour > 12 && hour <= 23)
    return { ...entry, hour: String(hour - 12), meridiem: "PM" };
  return entry;
}

export function isoFromClockMinutes(
  tournamentDate: string,
  totalMinutes: number,
  existingIso?: string | null
): string {
  const anchor = existingIso ? new Date(existingIso) : null;
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

const segmentClass =
  "w-12 rounded-md border bg-background py-1.5 text-center text-2xl font-semibold tabular-nums tracking-tight outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function StartTimeClockFields({
  entry,
  onChange,
  disabled,
  error,
  idPrefix = "clock",
}: {
  entry: ClockEntry;
  onChange: (next: ClockEntry) => void;
  disabled?: boolean;
  error?: string | null;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}-hour`}
          type="text"
          inputMode="numeric"
          aria-label="Hour"
          placeholder="--"
          maxLength={2}
          value={entry.hour}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...entry,
              hour: e.target.value.replace(/\D/g, "").slice(0, 2),
            })
          }
          onBlur={() => onChange(normalizeHourDisplay(entry))}
          className={segmentClass}
        />
        <span className="text-2xl font-semibold text-muted-foreground">:</span>
        <input
          id={`${idPrefix}-minute`}
          type="text"
          inputMode="numeric"
          aria-label="Minute"
          placeholder="--"
          maxLength={2}
          value={entry.minute}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...entry,
              minute: e.target.value.replace(/\D/g, "").slice(0, 2),
            })
          }
          onBlur={() =>
            onChange({
              ...entry,
              minute:
                entry.minute === "" ? "" : entry.minute.padStart(2, "0"),
            })
          }
          className={segmentClass}
        />
        <div className="ml-1 flex flex-col gap-1">
          {(["AM", "PM"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...entry, meridiem: m })}
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
