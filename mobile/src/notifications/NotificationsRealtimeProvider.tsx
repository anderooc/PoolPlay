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

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "~/auth/supabase";
import { useSession } from "~/auth/session";
import { subscribeToUserNotifications } from "~/notifications/realtime";

const NotificationsRealtimeContext = createContext(0);

export function NotificationsRealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useSession();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!session) return;
    return subscribeToUserNotifications(supabase, () => {
      setRevision((value) => value + 1);
    });
  }, [session]);

  return (
    <NotificationsRealtimeContext.Provider value={revision}>
      {children}
    </NotificationsRealtimeContext.Provider>
  );
}

export function useNotificationsRealtimeRevision(): number {
  return useContext(NotificationsRealtimeContext);
}
