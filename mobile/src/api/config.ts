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
import { Platform } from "react-native";

function extra(name: string): string | undefined {
  const value = Constants.expoConfig?.extra?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const API_PORT = 3000;

/**
 * `localhost` on an Android emulator refers to the emulator itself, so the host
 * machine has to be reached through its alias instead.
 */
function forLoopbackHost(url: string): string {
  if (Platform.OS === "android") {
    return url.replace(/\/\/(localhost|127\.0\.0\.1)/, "//10.0.2.2");
  }
  return url;
}

/**
 * In development the API runs on the same machine as the Expo dev server. On a
 * physical device the Expo host address is the right LAN target; simulators and
 * emulators should use loopback aliases instead (stale LAN IPs are common).
 */
function devServerBaseUrl(): string | undefined {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:${API_PORT}` : undefined;
}

function isIosSimulator(): boolean {
  return Platform.OS === "ios" && Constants.isDevice === false;
}

function isAndroidEmulator(): boolean {
  return Platform.OS === "android" && Constants.isDevice === false;
}

function developmentBaseUrl(): string {
  const configured = extra("apiBaseUrl");
  if (configured) return forLoopbackHost(configured);

  if (isIosSimulator()) {
    return `http://localhost:${API_PORT}`;
  }
  if (isAndroidEmulator()) {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return devServerBaseUrl() ?? forLoopbackHost(`http://localhost:${API_PORT}`);
}

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? developmentBaseUrl()
).replace(/\/+$/, "");

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function assertSupabaseConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy mobile/.env.example to mobile/.env.local and fill both in."
    );
  }
}
