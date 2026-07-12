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

export type MatchFormat = "play_all_3" | "best_of_2" | "two_with_tiebreak";

const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  play_all_3: "Play all 3 sets",
  best_of_2: "Best of 2 (ties allowed)",
  two_with_tiebreak: "2 sets, 3rd if tied",
};

const MATCH_FORMAT_HINTS: Record<MatchFormat, string> = {
  play_all_3:
    "Every match plays 3 sets. Common in 3-team pools so each game runs the full series.",
  best_of_2:
    "Every match plays exactly 2 sets. A 1-1 split is allowed; pool standings break ties on points.",
  two_with_tiebreak:
    "Every match plays 2 sets. If teams split, play a shorter 3rd tiebreak set.",
};

export function formatMatchFormatLabel(format: MatchFormat): string {
  return MATCH_FORMAT_LABELS[format];
}

export function formatMatchFormatHint(format: MatchFormat): string {
  return MATCH_FORMAT_HINTS[format];
}

export const MATCH_FORMATS: readonly MatchFormat[] = [
  "play_all_3",
  "best_of_2",
  "two_with_tiebreak",
] as const;
