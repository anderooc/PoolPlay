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

import type { AppUser } from "@/lib/auth";
import {
  notificationKindLabel,
  safeInternalHref,
} from "@/lib/notifications/display";
import { mapNotificationHrefForMobile } from "@/lib/notifications/mobile-href";
import {
  countUnreadUserNotifications,
  listUserNotifications,
  markUserNotificationsRead,
  type UserNotificationRow,
} from "@/lib/notifications/store";
import type {
  NotificationItemContract,
  NotificationsContract,
  NotificationsReadResultContract,
} from "../contracts/notifications";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function serializeNotification(row: UserNotificationRow): NotificationItemContract {
  const href = safeInternalHref(row.href);
  return {
    id: row.id,
    kind: row.kind,
    kindLabel: notificationKindLabel(row.kind),
    title: row.title,
    body: row.body,
    href,
    mobileHref: mapNotificationHrefForMobile(href),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadNotificationsForViewer(
  user: AppUser,
  limit?: number
): Promise<NotificationsContract> {
  const capped = clampLimit(limit);
  const [unreadCount, rows] = await Promise.all([
    countUnreadUserNotifications(user.id),
    listUserNotifications(user.id, capped),
  ]);

  return {
    unreadCount,
    notifications: rows.map(serializeNotification),
  };
}

export async function markNotificationsReadForViewer(
  user: AppUser,
  ids?: string[]
): Promise<NotificationsReadResultContract> {
  await markUserNotificationsRead(user.id, ids);
  return {
    success: true,
    unreadCount: await countUnreadUserNotifications(user.id),
  };
}
