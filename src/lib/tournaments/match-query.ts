import { db } from "@/lib/db";
import {
  matches,
  pools,
  brackets,
  divisions,
} from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const divFromPool = alias(divisions, "match_div_pool");
const divFromBracket = alias(divisions, "match_div_bracket");

/** Match IDs that belong to a tournament (via pool or bracket division). */
export async function getTournamentMatchIds(
  tournamentId: string
): Promise<string[]> {
  const rows = await db
    .select({ id: matches.id })
    .from(matches)
    .leftJoin(pools, eq(matches.poolId, pools.id))
    .leftJoin(divFromPool, eq(pools.divisionId, divFromPool.id))
    .leftJoin(brackets, eq(matches.bracketId, brackets.id))
    .leftJoin(divFromBracket, eq(brackets.divisionId, divFromBracket.id))
    .where(
      or(
        eq(divFromPool.tournamentId, tournamentId),
        eq(divFromBracket.tournamentId, tournamentId)
      )
    );

  return rows.map((r) => r.id);
}

export async function matchBelongsToTournament(
  matchId: string,
  tournamentId: string
): Promise<boolean> {
  const ids = await getTournamentMatchIds(tournamentId);
  return ids.includes(matchId);
}

export async function getMatchTournamentId(
  matchId: string
): Promise<string | null> {
  const [row] = await db
    .select({
      poolTournamentId: divFromPool.tournamentId,
      bracketTournamentId: divFromBracket.tournamentId,
    })
    .from(matches)
    .leftJoin(pools, eq(matches.poolId, pools.id))
    .leftJoin(divFromPool, eq(pools.divisionId, divFromPool.id))
    .leftJoin(brackets, eq(matches.bracketId, brackets.id))
    .leftJoin(divFromBracket, eq(brackets.divisionId, divFromBracket.id))
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!row) return null;
  return row.poolTournamentId ?? row.bracketTournamentId ?? null;
}
