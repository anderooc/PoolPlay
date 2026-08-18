"use server";

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

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  countUnreadUserNotifications,
  listUserNotifications,
  markUserNotificationsRead,
  type UserNotificationRow,
} from "@/lib/notifications/store";
import { safeInternalHref } from "@/lib/notifications/display";
import type { UserNotificationKind } from "@/types";

export type NotificationCenterItem = {
  id: string;
  kind: UserNotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

function serializeNotification(row: UserNotificationRow): NotificationCenterItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: safeInternalHref(row.href),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getNotificationCenter(limit = 40): Promise<{
  unreadCount: number;
  notifications: NotificationCenterItem[];
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { unreadCount: 0, notifications: [] };
  }

  const [unreadCount, rows] = await Promise.all([
    countUnreadUserNotifications(user.id),
    listUserNotifications(user.id, limit),
  ]);

  return {
    unreadCount,
    notifications: rows.map(serializeNotification),
  };
}

export async function markNotificationsRead(ids?: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to manage notifications." as const };

  await markUserNotificationsRead(user.id, ids);
  revalidatePath("/notifications");
  return { success: true as const };
}
