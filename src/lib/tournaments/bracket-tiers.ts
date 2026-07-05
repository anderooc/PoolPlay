import { DEFAULT_BRACKET_SLOTS } from "@/lib/utils/bracket";

/** Display names for elimination tiers (gold / silver / bronze). */
export const BRACKET_TIER_NAMES = ["Gold", "Silver", "Bronze"] as const;

export type BracketTierName = (typeof BRACKET_TIER_NAMES)[number];

export function bracketTierName(tier: number): string {
  return BRACKET_TIER_NAMES[tier] ?? `Bracket ${tier + 1}`;
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
