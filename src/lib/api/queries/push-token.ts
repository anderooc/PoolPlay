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
  removeUserPushToken,
  upsertUserPushToken,
  type PushTokenPlatform,
} from "@/lib/notifications/push-tokens";
import type {
  PushTokenRegisterResultContract,
  PushTokenUnregisterResultContract,
} from "../contracts/push-token";
import { badRequest } from "../errors";

const EXPO_PUSH_TOKEN = /^ExponentPushToken\[[^\]]+\]$/;

function parsePlatform(value: unknown): PushTokenPlatform {
  if (value === "ios" || value === "android") return value;
  return "unknown";
}

export async function registerPushTokenForViewer(
  user: AppUser,
  input: {
    token: string;
    platform?: string;
    deviceName?: string | null;
  }
): Promise<PushTokenRegisterResultContract> {
  const token = input.token.trim();
  if (!EXPO_PUSH_TOKEN.test(token)) {
    throw badRequest("Provide a valid Expo push token.");
  }

  await upsertUserPushToken({
    userId: user.id,
    token,
    platform: parsePlatform(input.platform),
    deviceName: input.deviceName ?? null,
  });

  return { success: true, registered: true };
}

export async function unregisterPushTokenForViewer(
  user: AppUser,
  token: string
): Promise<PushTokenUnregisterResultContract> {
  const trimmed = token.trim();
  if (!EXPO_PUSH_TOKEN.test(trimmed)) {
    throw badRequest("Provide a valid Expo push token.");
  }

  await removeUserPushToken(user.id, trimmed);
  return { success: true };
}
