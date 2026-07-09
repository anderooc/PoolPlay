import type { Metadata } from "next";

export const APP_NAME = "PoolPlay";

export const APP_DEFAULT_DESCRIPTION =
  "Organize tournaments, manage teams, run pools and brackets, schedule courts, and track live scores for college club volleyball.";

/** Join title segments; root layout appends the app name via the title template. */
export function pageTitle(
  ...segments: (string | null | undefined | false)[]
): string {
  return segments
    .filter(
      (segment): segment is string =>
        typeof segment === "string" && segment.trim().length > 0
    )
    .join(" · ");
}

export function pageMetadata(
  title: string,
  description?: string
): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
  };
}
