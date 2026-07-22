/*
 * ShootSet - Collegiate club volleyball tournament hub
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
