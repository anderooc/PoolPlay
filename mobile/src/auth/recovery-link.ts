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

export const MOBILE_PASSWORD_RESET_REDIRECT = "brackt://reset-password";

export function parseAuthRecoveryUrl(
  url: string
): { accessToken: string; refreshToken: string } | null {
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const paramString =
    hashIndex >= 0
      ? url.slice(hashIndex + 1)
      : queryIndex >= 0
        ? url.slice(queryIndex + 1)
        : "";

  if (!paramString) return null;

  const params = new URLSearchParams(paramString);
  if (params.get("type") !== "recovery") return null;

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
}

export function isPasswordRecoveryUrl(url: string): boolean {
  return (
    url.includes("reset-password") ||
    (url.includes("type=recovery") && url.includes("access_token"))
  );
}
