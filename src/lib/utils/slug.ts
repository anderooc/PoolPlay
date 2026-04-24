/**
 * Turns a free-form name (e.g. "Spring Classic 2026!") into a URL-safe slug
 * ("spring-classic-2026"). Accents are stripped via NFKD normalization, and
 * any non [a-z0-9] runs collapse into a single hyphen.
 *
 * Empty/whitespace-only names fall back to a caller-provided prefix so we
 * can still produce a unique, readable URL.
 */
export function slugify(name: string, fallback = "item"): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || fallback;
}

/**
 * Given a base slug (already run through {@link slugify}) and the set of
 * slugs already taken in the target table, returns the base slug itself if
 * available; otherwise appends `-2`, `-3`, ... until a free slot is found.
 *
 * Callers should lock/retry on unique-constraint violations when two inserts
 * race — the set is a best-effort snapshot, not a hard guarantee.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const takenSet = taken instanceof Set ? taken : new Set(taken);
  if (!takenSet.has(base)) return base;
  let i = 2;
  while (takenSet.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
