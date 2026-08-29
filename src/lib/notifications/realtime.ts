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

import type { SupabaseClient } from "@supabase/supabase-js";

const DEBOUNCE_MS = 300;

function channelSuffix(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

/**
 * Subscribe to inbox INSERT/UPDATE events for the signed-in user. RLS limits
 * delivery to the viewer's own notification rows.
 */
export function subscribeToUserNotifications(
  supabase: SupabaseClient,
  onChange: () => void
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => onChange(), DEBOUNCE_MS);
  };

  const channel = supabase
    .channel(`user-notifications-${channelSuffix()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "user_notifications" },
      schedule
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "user_notifications" },
      schedule
    )
    .subscribe();

  return () => {
    if (timer) clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}
