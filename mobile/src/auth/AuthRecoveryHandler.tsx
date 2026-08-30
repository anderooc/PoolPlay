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

import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, type ReactNode } from "react";
import {
  isPasswordRecoveryUrl,
  parseAuthRecoveryUrl,
} from "~/auth/recovery-link";
import { supabase } from "~/auth/supabase";

export function AuthRecoveryHandler({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url || !isPasswordRecoveryUrl(url)) return;

      const tokens = parseAuthRecoveryUrl(url);
      if (!tokens) return;

      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (error) return;

      router.replace("/reset-password");
    }

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => subscription.remove();
  }, [router]);

  return children;
}
