/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import type { Metadata } from "next";

export const APP_NAME = "PoolPlay";

export const COPYRIGHT_HOLDER = "Andrew Chang";
export const COPYRIGHT_YEAR = 2026;

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
