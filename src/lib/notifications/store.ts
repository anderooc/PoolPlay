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

import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userNotifications } from "@/lib/db/schema";
import type { UserNotificationKind } from "@/types";
import { deliverPushNotifications } from "./push";
import {
  deliverNotificationEmails,
  loadNotificationPreferencesForUsers,
} from "./preferences";

export type NotificationInput = {
  userId: string;
  kind: UserNotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
  tournamentId?: string | null;
};

export type UserNotificationRow = {
  id: string;
  kind: UserNotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  tournamentId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function createUserNotifications(
  inputs: NotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;

  const unique = new Map<string, NotificationInput>();
  for (const input of inputs) {
    unique.set(`${input.userId}:${input.kind}:${input.href ?? ""}:${input.title}`, input);
  }
  const payload = [...unique.values()];

  const prefsByUser = await loadNotificationPreferencesForUsers(
    [...new Set(payload.map((input) => input.userId))]
  );

  const inserted = await db
    .insert(userNotifications)
    .values(
      payload.map((input) => ({
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        tournamentId: input.tournamentId ?? null,
      }))
    )
    .returning({
      id: userNotifications.id,
      userId: userNotifications.userId,
      kind: userNotifications.kind,
      title: userNotifications.title,
      body: userNotifications.body,
      href: userNotifications.href,
    });

  if (inserted.length > 0) {
    const pushRows = inserted.filter((row) => {
      const prefs = prefsByUser.get(row.userId)?.[row.kind];
      return prefs?.pushEnabled ?? true;
    });
    if (pushRows.length > 0) {
      void deliverPushNotifications(pushRows).catch(() => {
        // Push delivery is best-effort.
      });
    }

    void deliverNotificationEmails(
      inserted.map((row) => ({
        userId: row.userId,
        kind: row.kind,
        title: row.title,
        body: row.body,
        href: row.href,
      })),
      prefsByUser
    ).catch(() => {
      // Email delivery is best-effort.
    });
  }
}

export async function listUserNotifications(
  userId: string,
  limit = 40
): Promise<UserNotificationRow[]> {
  return db
    .select({
      id: userNotifications.id,
      kind: userNotifications.kind,
      title: userNotifications.title,
      body: userNotifications.body,
      href: userNotifications.href,
      tournamentId: userNotifications.tournamentId,
      readAt: userNotifications.readAt,
      createdAt: userNotifications.createdAt,
    })
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit);
}

export async function countUnreadUserNotifications(
  userId: string
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(userNotifications)
    .where(
      and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt))
    );
  return row?.value ?? 0;
}

export async function markUserNotificationsRead(
  userId: string,
  ids?: string[]
): Promise<void> {
  const now = new Date();
  if (ids && ids.length > 0) {
    await db
      .update(userNotifications)
      .set({ readAt: now })
      .where(
        and(
          eq(userNotifications.userId, userId),
          inArray(userNotifications.id, ids),
          isNull(userNotifications.readAt)
        )
      );
    return;
  }

  await db
    .update(userNotifications)
    .set({ readAt: now })
    .where(
      and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt))
    );
}
