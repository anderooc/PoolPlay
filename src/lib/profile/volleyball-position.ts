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

import {
  VOLLEYBALL_POSITIONS,
  VOLLEYBALL_POSITION_LABELS,
  VOLLEYBALL_POSITION_SHORT_LABELS,
} from "@/lib/constants/profile";
import type { VolleyballPosition } from "@/types";

/** Select sentinel for clearing a roster position. */
export const VOLLEYBALL_POSITION_UNSET = "none";

export function parseVolleyballPositionInput(
  value: unknown
): VolleyballPosition | null | "invalid" {
  if (value === null || value === undefined || value === "" || value === VOLLEYBALL_POSITION_UNSET) {
    return null;
  }
  if (
    typeof value === "string" &&
    (VOLLEYBALL_POSITIONS as readonly string[]).includes(value)
  ) {
    return value as VolleyballPosition;
  }
  return "invalid";
}

export function volleyballPositionSearchHaystack(
  position: VolleyballPosition | null | undefined
): string {
  if (!position) return "";
  return `${VOLLEYBALL_POSITION_LABELS[position]} ${VOLLEYBALL_POSITION_SHORT_LABELS[position]}`.toLowerCase();
}
