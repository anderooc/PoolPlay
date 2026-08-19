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

import { formatDistanceToNow } from "date-fns";
import type { UserNotificationKind } from "@/types";

export function notificationKindLabel(kind: UserNotificationKind): string {
  switch (kind) {
    case "tournament_posted":
      return "Tournament posted";
    case "tournament_message":
      return "Host message";
    case "chat_announcement":
      return "Announcement";
    case "registration_update":
      return "Registration";
  }
}

export function safeInternalHref(href: string | null | undefined): string | null {
  if (!href) return null;
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  return href;
}

export function formatNotificationTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}
