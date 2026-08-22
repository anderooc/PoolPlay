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

/**
 * Extracts the credential from an `Authorization: Bearer <token>` header.
 *
 * Returns null for anything malformed rather than throwing, so a garbled
 * header falls through to the cookie session path and ends as a normal 401
 * instead of a 500. The scheme match is case-insensitive per RFC 7235, and
 * tokens containing whitespace are rejected outright — a JWT never contains
 * any, so whitespace means the header was assembled wrong.
 */
export function bearerTokenFromHeader(
  headerValue: string | null | undefined
): string | null {
  if (!headerValue) return null;

  const match = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(headerValue.trim());
  return match?.[1] ?? null;
}

export function bearerTokenFromRequest(request: Request): string | null {
  return bearerTokenFromHeader(request.headers.get("authorization"));
}
