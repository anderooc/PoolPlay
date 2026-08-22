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

import type {
  PlayBracketContract,
  TournamentPlayContract,
} from "@/lib/api/contracts/tournament";

export interface DisplayBracket extends PlayBracketContract {
  /** Only set when two brackets share a name, so we can tell them apart. */
  contextName?: string;
}

/**
 * Combined pool-to-bracket draws live as Gold / Silver / Bronze, not as
 * per-pool trees. Flatten released brackets and order them by tier.
 */
export function flattenBrackets(
  play: TournamentPlayContract
): DisplayBracket[] {
  const items: DisplayBracket[] = [];
  for (const division of play.divisions) {
    if (!division.released) continue;
    for (const bracket of division.brackets) {
      items.push({ ...bracket, contextName: division.name });
    }
  }

  items.sort(
    (a, b) => a.tier - b.tier || a.name.localeCompare(b.name)
  );

  const nameCounts = new Map<string, number>();
  for (const item of items) {
    nameCounts.set(item.name, (nameCounts.get(item.name) ?? 0) + 1);
  }

  return items.map((item) => ({
    ...item,
    contextName:
      (nameCounts.get(item.name) ?? 0) > 1 ? item.contextName : undefined,
  }));
}
