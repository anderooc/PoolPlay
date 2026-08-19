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

export type JerseyOccupant = {
  userId: string;
  jerseyNumber: number | null;
};

export type JerseyCollisionKind = "school" | "team";

/** Empty input is allowed (no number). Values must be 0–99. */
export function parseJerseyNumber(value: unknown): number | null | "invalid" {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  if (!/^\d{1,2}$/.test(trimmed)) return "invalid";
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
    return "invalid";
  }
  return parsed;
}

export function findJerseyCollision(args: {
  userId: string;
  jerseyNumber: number | null;
  schoolOccupants: JerseyOccupant[];
  teamOccupants: JerseyOccupant[];
}): JerseyCollisionKind | null {
  if (args.jerseyNumber === null) return null;
  const takenBySomeoneElse = (occupants: JerseyOccupant[]) =>
    occupants.some(
      (occupant) =>
        occupant.userId !== args.userId &&
        occupant.jerseyNumber === args.jerseyNumber
    );
  if (takenBySomeoneElse(args.schoolOccupants)) return "school";
  if (takenBySomeoneElse(args.teamOccupants)) return "team";
  return null;
}

export function jerseyCollisionError(
  kind: JerseyCollisionKind,
  jerseyNumber: number
): string {
  if (kind === "school") {
    return `Jersey #${jerseyNumber} is already taken at this school.`;
  }
  return `Jersey #${jerseyNumber} is already taken on a team roster.`;
}

export const JERSEY_NUMBER_RANGE_ERROR = "Jersey number must be 0–99";
