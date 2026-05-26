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
