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

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { userPushTokens } from "@/lib/db/schema";

export type PushTokenPlatform = "ios" | "android" | "unknown";

export async function upsertUserPushToken(input: {
  userId: string;
  token: string;
  platform: PushTokenPlatform;
  deviceName?: string | null;
}): Promise<void> {
  const now = new Date();
  await db
    .insert(userPushTokens)
    .values({
      userId: input.userId,
      token: input.token,
      platform: input.platform,
      deviceName: input.deviceName ?? null,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: userPushTokens.token,
      set: {
        userId: input.userId,
        platform: input.platform,
        deviceName: input.deviceName ?? null,
        lastSeenAt: now,
      },
    });
}

export async function removeUserPushToken(
  userId: string,
  token: string
): Promise<void> {
  await db
    .delete(userPushTokens)
    .where(
      and(eq(userPushTokens.userId, userId), eq(userPushTokens.token, token))
    );
}

export async function listPushTokensForUsers(
  userIds: string[]
): Promise<{ userId: string; token: string }[]> {
  if (userIds.length === 0) return [];
  return db
    .select({
      userId: userPushTokens.userId,
      token: userPushTokens.token,
    })
    .from(userPushTokens)
    .where(inArray(userPushTokens.userId, userIds));
}

export async function removePushTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await db.delete(userPushTokens).where(inArray(userPushTokens.token, tokens));
}
