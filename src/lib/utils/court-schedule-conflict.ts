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

/** Minute-precision key so equal clock times collide even if seconds differ. */
export function courtScheduleSlotKey(
  courtId: string,
  scheduledTime: Date
): string {
  return `${courtId}:${Math.floor(scheduledTime.getTime() / 60_000)}`;
}

export type CourtScheduleOccupant = {
  matchId: string;
  courtId: string;
  scheduledTime: Date;
};

export function findCourtScheduleConflict(
  occupants: CourtScheduleOccupant[],
  matchId: string,
  courtId: string | null,
  scheduledTime: Date | null
): CourtScheduleOccupant | null {
  if (!courtId || !scheduledTime || Number.isNaN(scheduledTime.getTime())) {
    return null;
  }
  const key = courtScheduleSlotKey(courtId, scheduledTime);
  for (const occupant of occupants) {
    if (occupant.matchId === matchId) continue;
    if (courtScheduleSlotKey(occupant.courtId, occupant.scheduledTime) === key) {
      return occupant;
    }
  }
  return null;
}

export type CourtScheduleApplyCandidate = {
  matchId: string;
  proposedIso: string;
  courtId: string | null;
  /** Existing start time before this fill, if any. */
  currentTime: Date | null;
};

/**
 * Drop apply candidates that would double-book a court. Occupancy starts as
 * other matches' current slots (excluding candidates, whose old times free
 * up). Among candidates competing for the same slot, prefer one already set
 * to that time, then any already-scheduled match, then stable order.
 */
export function resolveCourtScheduleApplies(
  candidates: CourtScheduleApplyCandidate[],
  occupancy: CourtScheduleOccupant[]
): {
  accepted: CourtScheduleApplyCandidate[];
  rejectedIds: Set<string>;
} {
  const candidateIds = new Set(candidates.map((c) => c.matchId));
  const slots = new Map<string, string>();
  for (const occupant of occupancy) {
    if (candidateIds.has(occupant.matchId)) continue;
    slots.set(
      courtScheduleSlotKey(occupant.courtId, occupant.scheduledTime),
      occupant.matchId
    );
  }

  const ranked = [...candidates].sort((a, b) => {
    const aProposed = new Date(a.proposedIso).getTime();
    const bProposed = new Date(b.proposedIso).getTime();
    const aExact =
      a.currentTime != null && a.currentTime.getTime() === aProposed ? 0 : 1;
    const bExact =
      b.currentTime != null && b.currentTime.getTime() === bProposed ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aHas = a.currentTime != null ? 0 : 1;
    const bHas = b.currentTime != null ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.matchId.localeCompare(b.matchId);
  });

  const accepted: CourtScheduleApplyCandidate[] = [];
  const rejectedIds = new Set<string>();

  for (const candidate of ranked) {
    if (!candidate.courtId) {
      accepted.push(candidate);
      continue;
    }
    const proposed = new Date(candidate.proposedIso);
    if (Number.isNaN(proposed.getTime())) {
      rejectedIds.add(candidate.matchId);
      continue;
    }
    const key = courtScheduleSlotKey(candidate.courtId, proposed);
    if (slots.has(key)) {
      rejectedIds.add(candidate.matchId);
      continue;
    }
    slots.set(key, candidate.matchId);
    accepted.push(candidate);
  }

  return { accepted, rejectedIds };
}
