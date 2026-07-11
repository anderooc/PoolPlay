/** Reject protocol-relative and off-site redirect targets from auth callbacks. */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!next) return fallback;
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes(":") ||
    next.includes("\\")
  ) {
    return fallback;
  }
  return next;
}
