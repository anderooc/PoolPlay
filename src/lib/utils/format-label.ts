/**
 * Turns snake_case enum values into readable labels, e.g.
 * `registration_open` → "Registration open".
 */
export function formatSnakeCaseLabel(value: string): string {
  const normalized = value.replace(/_/g, " ").trim().replace(/\s+/g, " ");
  if (!normalized) return normalized;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}
