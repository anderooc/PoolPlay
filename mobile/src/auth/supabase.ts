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

import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  assertSupabaseConfig,
} from "~/api/config";
import { largeSecureStore } from "./large-secure-store";

assertSupabaseConfig();

/**
 * Supabase provides auth and Realtime for inbox updates on tables exposed with
 * row-level security. Application mutations still go through the brackt API.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: largeSecureStore,
    persistSession: true,
    autoRefreshToken: true,
    // There is no URL to read a session from on native; deep links are handled
    // explicitly where they arrive.
    detectSessionInUrl: false,
  },
});

/**
 * The refresh timer cannot run while the app is suspended, so it is stopped on
 * background and restarted on foreground. Without this, a token can silently
 * expire and the first request after resuming fails.
 */
export function registerAuthRefreshLifecycle(): () => void {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });

  if (AppState.currentState === "active") {
    void supabase.auth.startAutoRefresh();
  }

  return () => subscription.remove();
}
