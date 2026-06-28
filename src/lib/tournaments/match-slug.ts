import { slugify, uniqueSlug } from "@/lib/utils/slug";

/** Slug segment for a head-to-head matchup from team URL slugs. */
export function matchupSlugFromTeamSlugs(
  teamASlug: string,
  teamBSlug: string
): string {
  return slugify(`${teamASlug}-vs-${teamBSlug}`, "match");
}

/** Placeholder slug for a bracket slot before teams are assigned. */
export function bracketPlaceholderSlug(
  round: number,
  position: number
): string {
  return `round-${round}-match-${position}`;
}

/**
 * Pick a slug unique within a tournament. Pass the mutable `taken` set so
 * callers inserting a batch can reserve each slug as they go.
 */
export function reserveMatchSlug(base: string, taken: Set<string>): string {
  const slug = uniqueSlug(base, taken);
  taken.add(slug);
  return slug;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
