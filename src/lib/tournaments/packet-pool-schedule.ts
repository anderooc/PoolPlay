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

import { generatePoolMatchesWithRounds } from "@/lib/utils/pool";

export function matchPairKey(teamAId: string, teamBId: string): string {
  return teamAId < teamBId ? `${teamAId}:${teamBId}` : `${teamBId}:${teamAId}`;
}

export function formatSeedMatchup(seedA: number, seedB: number): string {
  const low = Math.min(seedA, seedB);
  const high = Math.max(seedA, seedB);
  return `Seed ${low} vs Seed ${high}`;
}

/** Build round lookup and seed maps for one pool from seeded member rows. */
export function buildPoolScheduleContext(
  members: Array<{ teamId: string; seed: number | null }>
): {
  teamIds: string[];
  seedByTeamId: Map<string, number>;
  roundByPair: Map<string, number>;
} {
  const sorted = [...members].sort((a, b) => {
    const seedA = a.seed ?? Number.MAX_SAFE_INTEGER;
    const seedB = b.seed ?? Number.MAX_SAFE_INTEGER;
    if (seedA !== seedB) return seedA - seedB;
    return a.teamId.localeCompare(b.teamId);
  });

  const teamIds = sorted.map((m) => m.teamId);
  const seedByTeamId = new Map<string, number>(
    sorted.map((m, index) => [m.teamId, m.seed ?? index + 1])
  );

  const roundByPair = new Map<string, number>();
  for (const matchup of generatePoolMatchesWithRounds(teamIds)) {
    roundByPair.set(
      matchPairKey(matchup.teamAId, matchup.teamBId),
      matchup.round
    );
  }

  return { teamIds, seedByTeamId, roundByPair };
}

export function lookupPoolMatchRound(
  roundByPair: Map<string, number>,
  teamAId: string | null,
  teamBId: string | null
): number | null {
  if (!teamAId || !teamBId) return null;
  return roundByPair.get(matchPairKey(teamAId, teamBId)) ?? null;
}

export function lookupTeamSeed(
  seedByTeamId: Map<string, number>,
  teamId: string | null
): number | null {
  if (!teamId) return null;
  return seedByTeamId.get(teamId) ?? null;
}
