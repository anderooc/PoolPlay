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

/*
 * Wire format shared by the API and the mobile client.
 *
 * Everything in `src/lib/api/contracts/` must stay free of runtime imports so
 * the mobile app can reference these types without pulling Drizzle, Supabase,
 * or `next/*` into its module graph. Server-side mapping lives in
 * `src/lib/api/projections/`.
 */

export const API_VERSION = "v1";

/**
 * Stable, machine-readable error codes. Shipped app binaries branch on these,
 * so treat the string values as a public contract: add codes, never rename.
 */
export const API_ERROR_CODES = [
  "bad_request",
  "unauthorized",
  "token_expired",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "internal_error",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiMeta {
  version: typeof API_VERSION;
  /** Present only on collection responses. */
  cursor?: { next: string | null };
}

/**
 * Responses are wrapped so top-level fields can be added without breaking
 * clients already parsing `data`. An app binary sitting in App Store review
 * cannot be force-updated, so the envelope is what keeps old versions working.
 */
export interface ApiSuccessBody<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
  meta: ApiMeta;
}

export type ApiBody<T> = ApiSuccessBody<T> | ApiErrorBody;
