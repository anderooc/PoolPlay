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

import { db } from "@/lib/db";
import { brackets, divisions, matches, tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type DbClient = typeof db;

export type BracketMatchSnapshot = {
  bracketRound: number | null;
  status: string;
  winnerId: string | null;
  teamAId: string | null;
  teamBId: string | null;
};

/** True when the bracket has at least one team placed in any match. */
export function bracketIsActive(matches: BracketMatchSnapshot[]): boolean {
  return matches.some((m) => m.teamAId != null || m.teamBId != null);
}

/** True when the bracket's final round is completed with a champion. */
export function bracketHasChampion(matches: BracketMatchSnapshot[]): boolean {
  if (matches.length === 0) return false;

  const maxRound = Math.max(...matches.map((m) => m.bracketRound ?? 0));
  if (maxRound < 1) return false;

  const finals = matches.filter((m) => m.bracketRound === maxRound);
  return finals.some(
    (m) =>
      m.status === "completed" &&
      m.winnerId != null &&
      (m.teamAId != null || m.teamBId != null)
  );
}

/** Every seeded bracket must have a completed final with a winner. */
export function allActiveBracketsHaveChampions(
  bracketsWithMatches: { matches: BracketMatchSnapshot[] }[]
): boolean {
  const active = bracketsWithMatches.filter((b) => bracketIsActive(b.matches));
  if (active.length === 0) return false;
  return active.every((b) => bracketHasChampion(b.matches));
}

async function loadBracketSnapshots(
  tournamentId: string,
  client: DbClient
): Promise<{ matches: BracketMatchSnapshot[] }[]> {
  const rows = await client
    .select({
      bracketId: matches.bracketId,
      bracketRound: matches.bracketRound,
      status: matches.status,
      winnerId: matches.winnerId,
      teamAId: matches.teamAId,
      teamBId: matches.teamBId,
    })
    .from(matches)
    .innerJoin(brackets, eq(matches.bracketId, brackets.id))
    .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
    .where(eq(divisions.tournamentId, tournamentId));

  const byBracket = new Map<string, BracketMatchSnapshot[]>();
  for (const row of rows) {
    if (!row.bracketId) continue;
    const list = byBracket.get(row.bracketId) ?? [];
    list.push({
      bracketRound: row.bracketRound,
      status: row.status,
      winnerId: row.winnerId,
      teamAId: row.teamAId,
      teamBId: row.teamBId,
    });
    byBracket.set(row.bracketId, list);
  }

  return [...byBracket.values()].map((matchList) => ({ matches: matchList }));
}

/**
 * Marks the tournament completed when every seeded bracket has a finished final
 * with a winner. No-op if the event is not in progress or brackets are unfinished.
 */
export async function tryCompleteTournamentWhenBracketsDone(
  tournamentId: string,
  client: DbClient = db
): Promise<boolean> {
  const [tournament] = await client
    .select({ status: tournaments.status })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.status !== "in_progress") return false;

  const snapshots = await loadBracketSnapshots(tournamentId, client);
  if (!allActiveBracketsHaveChampions(snapshots)) return false;

  await client
    .update(tournaments)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(tournaments.id, tournamentId));

  return true;
}

/**
 * Reverts a completed tournament to in progress when a bracket final is reopened
 * or corrected and champions are no longer all decided.
 */
export async function revertTournamentIfBracketsIncomplete(
  tournamentId: string,
  client: DbClient = db
): Promise<boolean> {
  const [tournament] = await client
    .select({ status: tournaments.status })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.status !== "completed") return false;

  const snapshots = await loadBracketSnapshots(tournamentId, client);
  if (allActiveBracketsHaveChampions(snapshots)) return false;

  await client
    .update(tournaments)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(tournaments.id, tournamentId));

  return true;
}
