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

import { safeInternalHref } from "./display";

/** Map dashboard web paths to Expo Router paths for deep links. */
export function mapNotificationHrefForMobile(
  href: string | null | undefined
): string | null {
  const safe = safeInternalHref(href);
  if (!safe) return null;

  const tournamentMatch = /^\/tournaments\/([^/?]+)(?:\?(.*))?$/.exec(safe);
  if (tournamentMatch) {
    const slug = tournamentMatch[1];
    const query = tournamentMatch[2] ?? "";
    const tab = new URLSearchParams(query).get("tab");
    if (tab === "chat") return `/tournament/${slug}/chat`;
    if (tab === "teams") return `/tournament/${slug}?tab=teams`;
    if (tab === "matches") return `/tournament/${slug}?tab=matches`;
    return `/tournament/${slug}`;
  }

  const schoolMatch = /^\/schools\/([^/?]+)/.exec(safe);
  if (schoolMatch) return `/schools/${schoolMatch[1]}`;

  return null;
}
