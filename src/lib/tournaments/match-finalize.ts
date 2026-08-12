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

import { db } from "@/lib/db";
import { matches, sets } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import {
  advanceBracketWinner,
  tryFillBracketFromPoolPlay,
} from "@/lib/tournaments/bracket-structure";
import { tryCompleteTournamentWhenBracketsDone } from "@/lib/tournaments/tournament-completion";

type DbClient = typeof db;

/** Upsert a set score; safe under concurrent writes for the same set number. */
export async function upsertSetScore(
  matchId: string,
  setNumber: number,
  teamAScore: number,
  teamBScore: number,
  client: DbClient = db
): Promise<void> {
  await client
    .insert(sets)
    .values({ matchId, setNumber, teamAScore, teamBScore })
    .onConflictDoUpdate({
      target: [sets.matchId, sets.setNumber],
      set: { teamAScore, teamBScore },
    });
}

/**
 * Mark a match completed only if it is not already completed.
 * Returns true when this call performed the transition.
 */
export async function markMatchCompletedIfPending(
  matchId: string,
  winnerId: string | null,
  client: DbClient = db
): Promise<boolean> {
  const updated = await client
    .update(matches)
    .set({ status: "completed", winnerId, updatedAt: new Date() })
    .where(and(eq(matches.id, matchId), ne(matches.status, "completed")))
    .returning({ id: matches.id });

  return updated.length > 0;
}

/**
 * Finalize a match and run bracket fill / tournament completion in one
 * transaction. Idempotent when the match is already completed.
 */
export async function completeMatchAndRunSideEffects(input: {
  matchId: string;
  winnerId: string | null;
  tournamentId: string;
  divisionId?: string | null;
}): Promise<{ newlyCompleted: boolean }> {
  return db.transaction(async (tx) => {
    const executor = tx as unknown as DbClient;
    const newlyCompleted = await markMatchCompletedIfPending(
      input.matchId,
      input.winnerId,
      executor
    );
    if (!newlyCompleted) {
      return { newlyCompleted: false };
    }

    await advanceBracketWinner(input.matchId, executor);
    if (input.divisionId) {
      await tryFillBracketFromPoolPlay(input.divisionId, executor);
    }
    await tryCompleteTournamentWhenBracketsDone(
      input.tournamentId,
      executor
    );
    return { newlyCompleted: true };
  });
}
