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

import { and, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  brackets,
  divisions,
  matches,
  tournaments,
} from "@/lib/db/schema";
import { resolveIsTournamentOrganizer } from "@/lib/tournaments/permissions";
import {
  countTournamentCombinedBracketTeams,
  ensureTournamentCombinedBrackets,
  regenerateTournamentCombinedBrackets,
  tournamentCombinedBracketsRegenerateState,
} from "@/lib/tournaments/bracket-structure";
import { validateBracketTierSettings } from "@/lib/tournaments/bracket-tiers";
import { updateMatchFormatSchema } from "@/lib/validators";
import type {
  TournamentBracketSettingsContract,
  TournamentPoolSettingsContract,
} from "../contracts/tournament-ops";
import { badRequest, forbidden } from "../errors";
import {
  requirePostedTournament,
  type PostedTournamentRow,
} from "./tournament-ops";

async function requireHost(
  tournament: PostedTournamentRow,
  user: AppUser
): Promise<void> {
  if (!(await resolveIsTournamentOrganizer(tournament, user))) {
    throw forbidden("Only the tournament host can manage these settings.");
  }
}

export async function loadTournamentPoolSettings(
  tournament: PostedTournamentRow,
  user: AppUser
): Promise<TournamentPoolSettingsContract> {
  await requireHost(tournament, user);
  return {
    matchFormat: tournament.matchFormat as TournamentPoolSettingsContract["matchFormat"],
    setStartingScore: tournament.setStartingScore,
    setTargetScore: tournament.setTargetScore,
    tiebreakTargetScore: tournament.tiebreakTargetScore,
    warmupFormat:
      tournament.warmupFormat as TournamentPoolSettingsContract["warmupFormat"],
    poolTiebreakCriteria:
      tournament.poolTiebreakCriteria as TournamentPoolSettingsContract["poolTiebreakCriteria"],
    poolSettingsSavedAt: tournament.poolSettingsSavedAt?.toISOString() ?? null,
  };
}

export async function updateTournamentPoolSettingsForViewer(
  slug: string,
  user: AppUser,
  input: {
    matchFormat: string;
    setStartingScore: number;
    setTargetScore: number;
    tiebreakTargetScore: number;
    warmupFormat: string;
    poolTiebreakCriteria: string[];
  }
): Promise<TournamentPoolSettingsContract> {
  const tournament = await requirePostedTournament(slug);
  await requireHost(tournament, user);

  const parsed = updateMatchFormatSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(
      parsed.error.issues[0]?.message ?? "Invalid pool settings."
    );
  }

  const [updated] = await db
    .update(tournaments)
    .set({
      matchFormat: parsed.data.matchFormat,
      setStartingScore: parsed.data.setStartingScore,
      setTargetScore: parsed.data.setTargetScore,
      tiebreakTargetScore: parsed.data.tiebreakTargetScore,
      warmupFormat: parsed.data.warmupFormat,
      poolTiebreakCriteria: parsed.data.poolTiebreakCriteria,
      poolSettingsSavedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournament.id))
    .returning();

  const row = updated ?? tournament;
  return {
    matchFormat: row.matchFormat as TournamentPoolSettingsContract["matchFormat"],
    setStartingScore: row.setStartingScore,
    setTargetScore: row.setTargetScore,
    tiebreakTargetScore: row.tiebreakTargetScore,
    warmupFormat:
      row.warmupFormat as TournamentPoolSettingsContract["warmupFormat"],
    poolTiebreakCriteria:
      row.poolTiebreakCriteria as TournamentPoolSettingsContract["poolTiebreakCriteria"],
    poolSettingsSavedAt: row.poolSettingsSavedAt?.toISOString() ?? null,
  };
}

export async function loadTournamentBracketSettings(
  tournament: PostedTournamentRow,
  user: AppUser
): Promise<TournamentBracketSettingsContract> {
  await requireHost(tournament, user);

  const poolDivisions = await db
    .select({ id: divisions.id })
    .from(divisions)
    .where(
      and(
        eq(divisions.tournamentId, tournament.id),
        eq(divisions.format, "pool_to_bracket")
      )
    );

  const hasPoolToBracket = poolDivisions.length > 0;
  const [totalBracketTeams, regenerateState, placed] = await Promise.all([
    hasPoolToBracket
      ? countTournamentCombinedBracketTeams(tournament.id)
      : Promise.resolve(0),
    hasPoolToBracket
      ? tournamentCombinedBracketsRegenerateState(tournament.id)
      : Promise.resolve({ canRegenerate: false, reason: undefined as string | undefined }),
    hasPoolToBracket
      ? db
          .select({ teamAId: matches.teamAId, teamBId: matches.teamBId })
          .from(matches)
          .innerJoin(brackets, eq(matches.bracketId, brackets.id))
          .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
          .where(
            and(
              eq(divisions.tournamentId, tournament.id),
              eq(divisions.format, "pool_to_bracket")
            )
          )
      : Promise.resolve([]),
  ]);

  const locked = placed.some((m) => m.teamAId != null || m.teamBId != null);

  return {
    bracketCount: tournament.bracketCount ?? 1,
    goldTeamCount: tournament.goldTeamCount,
    silverTeamCount: tournament.silverTeamCount,
    totalBracketTeams,
    locked,
    canRegenerate: regenerateState.canRegenerate,
    regenerateBlockedReason: regenerateState.reason ?? null,
    hasPoolToBracket,
    bracketSettingsSavedAt:
      tournament.bracketSettingsSavedAt?.toISOString() ?? null,
  };
}

export async function updateTournamentBracketSettingsForViewer(
  slug: string,
  user: AppUser,
  input: {
    bracketCount: number;
    goldTeamCount: number | null;
    silverTeamCount: number | null;
  }
): Promise<TournamentBracketSettingsContract> {
  const tournament = await requirePostedTournament(slug);
  await requireHost(tournament, user);

  const bracketCount = Math.min(3, Math.max(1, Math.floor(input.bracketCount)));
  let goldTeamCount = input.goldTeamCount;
  let silverTeamCount = input.silverTeamCount;

  if (bracketCount >= 2) {
    if (goldTeamCount == null || goldTeamCount < 2) {
      throw badRequest("Gold needs at least 2 teams.");
    }
  } else {
    goldTeamCount = null;
    silverTeamCount = null;
  }

  if (bracketCount === 3) {
    if (silverTeamCount == null || silverTeamCount < 2) {
      throw badRequest("Silver needs at least 2 teams when using three brackets.");
    }
  } else {
    silverTeamCount = null;
  }

  const totalTeams = await countTournamentCombinedBracketTeams(tournament.id);
  if (totalTeams >= 2) {
    const tierValidation = validateBracketTierSettings(
      totalTeams,
      bracketCount,
      goldTeamCount,
      silverTeamCount
    );
    if (!tierValidation.ok) {
      throw badRequest(tierValidation.error);
    }
  }

  const poolDivisions = await db
    .select({ id: divisions.id })
    .from(divisions)
    .where(
      and(
        eq(divisions.tournamentId, tournament.id),
        eq(divisions.format, "pool_to_bracket")
      )
    );

  const placed = await db
    .select({ teamAId: matches.teamAId, teamBId: matches.teamBId })
    .from(matches)
    .innerJoin(brackets, eq(matches.bracketId, brackets.id))
    .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
    .where(
      and(
        eq(divisions.tournamentId, tournament.id),
        eq(divisions.format, "pool_to_bracket")
      )
    );

  const hasTeams = placed.some((m) => m.teamAId != null || m.teamBId != null);

  if (hasTeams) {
    const regenerateState = await tournamentCombinedBracketsRegenerateState(
      tournament.id
    );
    if (!regenerateState.canRegenerate) {
      throw badRequest(
        regenerateState.reason ??
          "Bracket settings are locked while bracket play is in progress."
      );
    }
  }

  await db
    .update(tournaments)
    .set({
      bracketCount,
      goldTeamCount,
      silverTeamCount,
      bracketSettingsSavedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournament.id));

  if (hasTeams) {
    const result = await regenerateTournamentCombinedBrackets(tournament.id);
    if (result.error) throw badRequest(result.error);
  } else if (poolDivisions.length > 0) {
    await ensureTournamentCombinedBrackets(tournament.id);
  }

  const refreshed = await requirePostedTournament(slug);
  return loadTournamentBracketSettings(refreshed, user);
}
