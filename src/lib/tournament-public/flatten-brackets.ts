/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type {
  PlayBracketContract,
  TournamentPlayContract,
} from "@/lib/api/contracts/tournament";

export interface DisplayBracket extends PlayBracketContract {
  contextName?: string;
}

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

  items.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

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
