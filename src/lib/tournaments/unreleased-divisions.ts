/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { brackets, divisions, matches, pools } from "@/lib/db/schema";

/** Division ids whose pool play is still hidden from participants. */
export async function getUnreleasedDivisionIds(
  tournamentId: string
): Promise<Set<string>> {
  const rows = await db
    .select({ id: divisions.id })
    .from(divisions)
    .where(
      and(
        eq(divisions.tournamentId, tournamentId),
        isNull(divisions.poolsReleasedAt)
      )
    );
  return new Set(rows.map((r) => r.id));
}

/** Map match id → division id for pool and bracket matches in a tournament. */
export async function getMatchDivisionIdMap(
  tournamentId: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const poolRows = await db
    .select({
      matchId: matches.id,
      divisionId: pools.divisionId,
    })
    .from(matches)
    .innerJoin(pools, eq(matches.poolId, pools.id))
    .innerJoin(divisions, eq(pools.divisionId, divisions.id))
    .where(eq(divisions.tournamentId, tournamentId));

  for (const row of poolRows) {
    map.set(row.matchId, row.divisionId);
  }

  const bracketRows = await db
    .select({
      matchId: matches.id,
      divisionId: brackets.divisionId,
    })
    .from(matches)
    .innerJoin(brackets, eq(matches.bracketId, brackets.id))
    .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
    .where(eq(divisions.tournamentId, tournamentId));

  for (const row of bracketRows) {
    map.set(row.matchId, row.divisionId);
  }

  return map;
}
