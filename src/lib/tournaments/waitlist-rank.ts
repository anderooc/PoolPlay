/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

export function withTournamentQueueRanks<T extends { position: number }>(
  rows: T[]
): Array<Omit<T, "position"> & { queueRank: number }> {
  return rows.map((row, index) => {
    const { position, ...clientSafeRow } = row;
    void position;
    return { ...clientSafeRow, queueRank: index + 1 };
  });
}
