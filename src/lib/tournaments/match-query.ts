import { db } from "@/lib/db";
import {
  matches,
  pools,
  brackets,
  divisions,
} from "@/lib/db/schema";
import { and, count, eq, inArray, isNotNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { isUuid } from "@/lib/tournaments/match-slug";

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

/**
 * Whether the tournament has any match with a scheduled time. Folds the
 * match-id lookup and the scheduled count into a single query.
 */
export async function tournamentHasScheduledMatches(
  tournamentId: string
): Promise<boolean> {
  const [row] = await db
    .select({ value: count() })
    .from(matches)
    .leftJoin(pools, eq(matches.poolId, pools.id))
    .leftJoin(divFromPool, eq(pools.divisionId, divFromPool.id))
    .leftJoin(brackets, eq(matches.bracketId, brackets.id))
    .leftJoin(divFromBracket, eq(brackets.divisionId, divFromBracket.id))
    .where(
      and(
        or(
          eq(divFromPool.tournamentId, tournamentId),
          eq(divFromBracket.tournamentId, tournamentId)
        ),
        isNotNull(matches.scheduledTime)
      )
    );

  return (row?.value ?? 0) > 0;
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
      tournamentId: matches.tournamentId,
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
  return (
    row.tournamentId ?? row.poolTournamentId ?? row.bracketTournamentId ?? null
  );
}

/** Slugs already used in a tournament; optionally exclude specific match rows. */
export async function getTakenMatchSlugsInTournament(
  tournamentId: string,
  excludeMatchIds: string[] = [],
  client: typeof db = db
): Promise<Set<string>> {
  const exclude = new Set(excludeMatchIds);
  const rows = await client
    .select({ id: matches.id, slug: matches.slug })
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId));

  const taken = new Set<string>();
  for (const row of rows) {
    if (!exclude.has(row.id)) taken.add(row.slug);
  }
  return taken;
}

/** Resolve a match by URL slug or legacy UUID within a tournament. */
export async function resolveMatchInTournament(
  tournamentId: string,
  slugOrId: string
) {
  const key = slugOrId.trim();

  if (isUuid(key)) {
    const [byDenorm] = await db
      .select()
      .from(matches)
      .where(and(eq(matches.id, key), eq(matches.tournamentId, tournamentId)))
      .limit(1);
    if (byDenorm) return byDenorm;

    const tournamentMatchIds = await getTournamentMatchIds(tournamentId);
    if (!tournamentMatchIds.includes(key)) return null;

    const [byId] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, key))
      .limit(1);
    return byId ?? null;
  }

  const [byDenorm] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.slug, key)))
    .limit(1);
  if (byDenorm) return byDenorm;

  // Fallback when denormalized tournament_id is stale but the match still
  // belongs to this tournament via its pool/bracket division.
  const tournamentMatchIds = await getTournamentMatchIds(tournamentId);
  if (tournamentMatchIds.length === 0) return null;

  const [byDivision] = await db
    .select()
    .from(matches)
    .where(and(inArray(matches.id, tournamentMatchIds), eq(matches.slug, key)))
    .limit(1);
  return byDivision ?? null;
}
