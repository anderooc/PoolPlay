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
import { getCurrentUser, resolveAppUser, type AppUser } from "@/lib/auth";
import { bearerTokenFromRequest } from "./bearer-token";
import { forbidden, tokenExpired, unauthorized } from "./errors";

/**
 * Whether the caller authenticated with a bearer token (native app) or a
 * cookie session (browser). Handlers occasionally need to know, e.g. to skip
 * cookie-based CSRF expectations.
 */
export type ViewerTransport = "bearer" | "cookie";

export interface Viewer {
  user: AppUser;
  transport: ViewerTransport;
}

/**
 * Stateless client used purely to validate a caller-supplied JWT. Session
 * persistence and refresh are disabled because there is no session to keep on
 * the server; each request carries its own credential.
 */
function statelessAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function looksExpired(error: { message?: string; code?: string }): boolean {
  const haystack = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return haystack.includes("expired");
}

/**
 * The web app checks `disabledAt` at each mutation site. This surface enforces
 * it once at the boundary instead, matching the `disabled_at IS NULL` condition
 * the RLS helpers apply, so a disabled account cannot read through the API
 * either.
 */
function assertEnabled(user: AppUser): AppUser {
  if (user.disabledAt) {
    throw forbidden("This account has been disabled.");
  }
  return user;
}

/**
 * Resolves the caller from an `Authorization: Bearer` header, falling back to
 * the cookie session. Returns null when neither identifies a user.
 *
 * The token is verified against the Supabase Auth server rather than decoded
 * locally, so a revoked or tampered JWT is rejected even though it may still
 * be within its expiry window.
 */
export async function resolveViewer(request: Request): Promise<Viewer | null> {
  const token = bearerTokenFromRequest(request);

  if (token) {
    const { data, error } = await statelessAuthClient().auth.getUser(token);

    if (error) {
      throw looksExpired(error) ? tokenExpired() : unauthorized();
    }
    if (!data.user) return null;

    const user = await resolveAppUser(data.user);
    return user ? { user: assertEnabled(user), transport: "bearer" } : null;
  }

  const user = await getCurrentUser();
  return user ? { user: assertEnabled(user), transport: "cookie" } : null;
}

/** Same as resolveViewer, but rejects anonymous callers with a 401. */
export async function requireViewer(request: Request): Promise<Viewer> {
  const viewer = await resolveViewer(request);
  if (!viewer) throw unauthorized();
  return viewer;
}
