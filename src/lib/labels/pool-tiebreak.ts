/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

export type PoolTiebreakCriterion =
  | "match_record"
  | "set_record"
  | "point_diff"
  | "head_to_head";

export const POOL_TIEBREAK_CRITERIA: readonly PoolTiebreakCriterion[] = [
  "match_record",
  "set_record",
  "point_diff",
  "head_to_head",
] as const;

const LABELS: Record<PoolTiebreakCriterion, string> = {
  match_record: "Match record (W-L)",
  set_record: "Set record (sets won-lost)",
  point_diff: "Point differential (+/-)",
  head_to_head: "Head-to-head (2-team tie)",
};

const HINTS: Record<PoolTiebreakCriterion, string> = {
  match_record: "Higher match win percentage ranks above.",
  set_record: "Break ties using set differential / set record.",
  point_diff: "Break ties using total points for minus points against.",
  head_to_head:
    "Only applies when exactly two teams remain tied after earlier criteria.",
};

export function formatPoolTiebreakCriterionLabel(
  c: PoolTiebreakCriterion
): string {
  return LABELS[c];
}

export function formatPoolTiebreakCriterionHint(
  c: PoolTiebreakCriterion
): string {
  return HINTS[c];
}

