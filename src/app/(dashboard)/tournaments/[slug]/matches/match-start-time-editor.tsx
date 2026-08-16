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

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { updateMatchScheduledTime } from "./actions";
import {
  isoFromClockMinutes,
  isoToMinutes,
  minutesToEntry,
  minutesToLabel,
  validateClockEntry,
  StartTimeClockFields,
  type ClockEntry,
} from "./start-time-clock";

type PendingToast = {
  /** Minutes-of-day we expect on the trigger, or null when cleared. */
  expectedMinutes: number | null;
  message: string;
};

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
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Optimistic label so the trigger updates before RSC refresh lands. */
  const [displayTime, setDisplayTime] = useState(scheduledTime);
  const [pendingToast, setPendingToast] = useState<PendingToast | null>(null);

  useEffect(() => {
    if (pendingToast) {
      // Keep the optimistic label until the refreshed prop matches what we saved.
      if (isoToMinutes(scheduledTime) === pendingToast.expectedMinutes) {
        setDisplayTime(scheduledTime);
      }
      return;
    }
    setDisplayTime(scheduledTime);
  }, [scheduledTime, pendingToast]);

  const selectedMinutes = isoToMinutes(displayTime);
  const [entry, setEntry] = useState<ClockEntry>(() =>
    minutesToEntry(selectedMinutes)
  );

  useEffect(() => {
    if (open) {
      setEntry(minutesToEntry(selectedMinutes));
      setError(null);
    }
  }, [open, selectedMinutes]);

  // Toast only after the trigger label reflects the saved time.
  useEffect(() => {
    if (!pendingToast) return;
    if (selectedMinutes !== pendingToast.expectedMinutes) return;
    toast.success(pendingToast.message);
    setPendingToast(null);
  }, [pendingToast, selectedMinutes]);

  async function persist(iso: string | null) {
    setBusy(true);
    const hadTime = isoToMinutes(displayTime) != null;
    const result = await updateMatchScheduledTime(matchId, iso);
    setBusy(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }

    const message = !iso
      ? "Start time cleared"
      : hadTime
        ? "Start time updated"
        : "Start time added";

    setOpen(false);
    setDisplayTime(iso);
    setPendingToast({
      expectedMinutes: isoToMinutes(iso),
      message,
    });
    startTransition(() => router.refresh());
  }

  function handleSave() {
    const parsed = validateClockEntry(entry);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    void persist(
      isoFromClockMinutes(tournamentDate, parsed.minutes, displayTime)
    );
  }

  const hasTime = selectedMinutes != null;
  const displayLabel = hasTime ? minutesToLabel(selectedMinutes) : triggerLabel;

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
              onClick={() => void persist(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </PopoverHeader>

        <StartTimeClockFields
          entry={entry}
          disabled={busy}
          error={error}
          onChange={(next) => {
            setError(null);
            setEntry(next);
          }}
        />

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
