/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { isTournamentArchived } from "@/lib/tournament-status";
import type { PublicRegistrationAvailability } from "./public-projection";

export interface PublicTournamentRefreshPolicy {
  intervalMs: number | null;
  label: string;
}

export interface PublicTournamentLifecycle {
  resolved: boolean;
  archived: boolean;
  canRegister: boolean;
  refreshPolicy: PublicTournamentRefreshPolicy;
}

/** Spreads refreshes across a ±10% window to avoid synchronized request bursts. */
export function publicRefreshDelay(
  intervalMs: number,
  randomUnit: number = Math.random()
): number {
  const boundedRandom = Math.min(1, Math.max(0, randomUnit));
  return Math.round(intervalMs * (0.9 + boundedRandom * 0.2));
}

export function publicTournamentRefreshPolicy({
  hasLiveMatch,
  status,
  archived,
  registrationDeadline = null,
  now = "",
}: {
  hasLiveMatch: boolean;
  status: string;
  archived: boolean;
  registrationDeadline?: string | null;
  now?: string;
}): PublicTournamentRefreshPolicy {
  if (hasLiveMatch) {
    return {
      intervalMs: 15_000,
      label: "Live updates every 15 seconds",
    };
  }
  if (archived || status === "completed") {
    return {
      intervalMs: 300_000,
      label: "Final results · checks for corrections every 5 minutes",
    };
  }
  const deadlineInterval = registrationDeadlineRefreshInterval(
    status,
    registrationDeadline,
    now
  );
  if (deadlineInterval != null && deadlineInterval < 60_000) {
    return {
      intervalMs: deadlineInterval,
      label: "Registration deadline · refreshes at closing time",
    };
  }
  return {
    intervalMs: 60_000,
    label: "Checks for updates every minute",
  };
}

export function registrationPresentationOpen(
  status: string,
  deadline: string | null,
  now: string
): boolean {
  if (status !== "registration_open") return false;
  if (deadline == null) return true;
  const deadlineMs = Date.parse(deadline);
  const nowMs = Date.parse(now);
  return (
    Number.isFinite(deadlineMs) &&
    Number.isFinite(nowMs) &&
    nowMs < deadlineMs
  );
}

export function registrationAvailabilityOpen(
  status: string,
  availability: Pick<PublicRegistrationAvailability, "deadline"> | null | undefined,
  now: string
): boolean {
  return registrationPresentationOpen(
    status,
    availability?.deadline ?? null,
    now
  );
}

function registrationDeadlineRefreshInterval(
  status: string,
  deadline: string | null,
  now: string
): number | null {
  if (status !== "registration_open" || deadline == null) return null;
  const remainingMs = Date.parse(deadline) - Date.parse(now);
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return null;
  return Math.max(1, Math.floor(remainingMs / 1.1));
}

export function publicTournamentLifecycle({
  date,
  status,
  hasLiveMatch,
  today,
  registrationDeadline = null,
  now = "",
}: {
  date: string;
  status: string;
  hasLiveMatch: boolean;
  today: string;
  registrationDeadline?: string | null;
  now?: string;
}): PublicTournamentLifecycle {
  if (today.length === 0) {
    return {
      resolved: false,
      archived: false,
      canRegister: false,
      refreshPolicy: { intervalMs: null, label: "" },
    };
  }
  const archived =
    !hasLiveMatch && isTournamentArchived(date, today);
  return {
    resolved: true,
    archived,
    canRegister:
      !archived &&
      registrationPresentationOpen(status, registrationDeadline, now),
    refreshPolicy: publicTournamentRefreshPolicy({
      hasLiveMatch,
      status,
      archived,
      registrationDeadline,
      now,
    }),
  };
}
