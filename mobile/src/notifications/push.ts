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

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  registerPushToken,
  unregisterPushToken,
} from "~/api/endpoints";

const EXPO_PUSH_TOKEN = /^ExponentPushToken\[[^\]]+\]$/;

let configured = false;

export function configurePushNotifications(): void {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function resolveExpoProjectId(): string | undefined {
  const envId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (typeof envId === "string" && envId.length > 0) return envId;

  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string }; easProjectId?: string }
    | undefined;
  const fromEas = extra?.eas?.projectId ?? extra?.easProjectId;
  return typeof fromEas === "string" && fromEas.length > 0 ? fromEas : undefined;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function acquireExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  configurePushNotifications();
  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = resolveExpoProjectId();
  if (!projectId) return null;

  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return EXPO_PUSH_TOKEN.test(result.data) ? result.data : null;
}

export async function syncPushTokenWithServer(token: string): Promise<void> {
  await registerPushToken({
    token,
    platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown",
    deviceName: Device.modelName ?? null,
  });
}

export async function clearPushTokenOnServer(token: string): Promise<void> {
  try {
    await unregisterPushToken(token);
  } catch {
    // Best-effort on sign-out.
  }
}

export function extractMobileHrefFromNotification(
  data: Record<string, unknown> | undefined
): string | null {
  const mobileHref = data?.mobileHref;
  return typeof mobileHref === "string" && mobileHref.startsWith("/")
    ? mobileHref
    : null;
}
