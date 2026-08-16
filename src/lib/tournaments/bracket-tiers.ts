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

import { DEFAULT_BRACKET_SLOTS } from "@/lib/utils/bracket";

/** Display names for elimination tiers (gold / silver / bronze). */
export const BRACKET_TIER_NAMES = ["Gold", "Silver", "Bronze"] as const;

export type BracketTierName = (typeof BRACKET_TIER_NAMES)[number];

export function bracketTierName(tier: number): string {
  return BRACKET_TIER_NAMES[tier] ?? `Bracket ${tier + 1}`;
}

/** Host-facing bracket title from stored name or tier (never a pool/division name). */
export function bracketDisplayName(bracket: {
  name: string | null | undefined;
  tier: number;
}): string {
  const named = bracket.name?.trim();
  return named || bracketTierName(bracket.tier);
}

/** Schedule / admin label, e.g. "Gold bracket". */
export function bracketScheduleLabel(bracket: {
  name: string | null | undefined;
  tier: number;
}): string {
  return `${bracketDisplayName(bracket)} bracket`;
}

export type BracketTierSettingsValidation =
  | { ok: true; tiers: number[] }
  | { ok: false; error: string };

/**
 * Validate explicit gold / silver counts against the combined team total.
 * Each active bracket tier needs at least 2 teams.
 */
export function validateBracketTierSettings(
  totalTeams: number,
  bracketCount: number,
  goldTeamCount: number | null,
  silverTeamCount: number | null
): BracketTierSettingsValidation {
  const count = Math.min(3, Math.max(1, Math.floor(bracketCount)));

  if (totalTeams < 2) {
    return { ok: false, error: "Need at least 2 teams across all pools" };
  }

  if (count === 1) {
    return { ok: true, tiers: [totalTeams] };
  }

  const gold = goldTeamCount;
  if (gold == null || !Number.isFinite(gold) || gold < 2) {
    return { ok: false, error: "Gold needs at least 2 teams" };
  }

  if (count === 2) {
    if (totalTeams < 4) {
      return {
        ok: false,
        error: "Need at least 4 teams for separate gold and silver brackets",
      };
    }
    if (gold > totalTeams - 2) {
      return {
        ok: false,
        error: `Gold can have at most ${totalTeams - 2} teams — silver needs at least 2 of ${totalTeams} teams`,
      };
    }
    return { ok: true, tiers: [gold, totalTeams - gold] };
  }

  if (totalTeams < 6) {
    return {
      ok: false,
      error: "Need at least 6 teams for gold, silver, and bronze brackets",
    };
  }

  const silver = silverTeamCount;
  if (silver == null || !Number.isFinite(silver) || silver < 2) {
    return { ok: false, error: "Silver needs at least 2 teams" };
  }

  if (gold > totalTeams - 4) {
    return {
      ok: false,
      error: `Gold can have at most ${totalTeams - 4} teams — silver and bronze each need at least 2`,
    };
  }

  const maxSilver = totalTeams - gold - 2;
  if (silver > maxSilver) {
    return {
      ok: false,
      error: `Silver can have at most ${maxSilver} teams — bronze needs at least 2 of ${totalTeams} teams`,
    };
  }

  const bronze = totalTeams - gold - silver;
  if (bronze < 2) {
    if (bronze <= 0) {
      return {
        ok: false,
        error: `No teams left for bronze (${gold} gold + ${silver} silver exceeds ${totalTeams} teams)`,
      };
    }
    return {
      ok: false,
      error: `Only ${bronze} team would be in bronze — each bracket needs at least 2 teams`,
    };
  }

  return { ok: true, tiers: [gold, silver, bronze] };
}

/** Human-readable split preview, e.g. "Gold 6 · Silver 4". */
export function describeBracketTierSplit(tiers: number[]): string {
  return tiers
    .map((n, tier) => `${bracketTierName(tier)} ${n}`)
    .join(" · ");
}

/**
 * How many teams go into each tier from ranked pool standings.
 * Tiers with fewer than 2 teams are dropped (merged into the previous tier).
 */
export function tierTeamCounts(
  totalTeams: number,
  bracketCount: number,
  goldTeamCount: number | null,
  silverTeamCount: number | null
): number[] {
  const count = Math.min(3, Math.max(1, bracketCount));
  if (totalTeams < 2) return [];

  if (count === 1) {
    return [totalTeams];
  }

  // Leave room for at least 2 teams in each lower tier when possible.
  const minLower = (count - 1) * 2;
  let gold =
    goldTeamCount != null && goldTeamCount >= 2
      ? goldTeamCount
      : Math.max(2, Math.ceil(totalTeams / count));
  gold = Math.min(gold, Math.max(2, totalTeams - minLower));

  if (count === 2) {
    const silver = totalTeams - gold;
    if (silver < 2) return [totalTeams];
    return [gold, silver];
  }

  // count === 3
  const remaining = totalTeams - gold;
  let silver =
    silverTeamCount != null && silverTeamCount >= 2
      ? silverTeamCount
      : Math.max(2, Math.floor(remaining / 2));
  silver = Math.min(silver, Math.max(2, remaining - 2));
  const bronze = totalTeams - gold - silver;

  const tiers = [gold, silver, bronze];
  // Merge undersized trailing tiers upward.
  while (tiers.length > 1 && tiers[tiers.length - 1] < 2) {
    const last = tiers.pop()!;
    tiers[tiers.length - 1] += last;
  }
  return tiers;
}

/** Estimated skeleton sizes before pool play finishes. */
export function estimatedTierSlotCounts(
  bracketCount: number,
  goldTeamCount: number | null,
  silverTeamCount: number | null
): number[] {
  return tierTeamCounts(
    DEFAULT_BRACKET_SLOTS,
    bracketCount,
    goldTeamCount,
    silverTeamCount
  );
}
