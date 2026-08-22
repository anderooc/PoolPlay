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
  API_VERSION,
  type ApiErrorBody,
  type ApiMeta,
  type ApiSuccessBody,
} from "./contracts/envelope";
import { type ApiError } from "./errors";

export {
  API_VERSION,
  type ApiErrorBody,
  type ApiMeta,
  type ApiSuccessBody,
} from "./contracts/envelope";

export function successBody<T>(
  data: T,
  meta?: Omit<ApiMeta, "version">
): ApiSuccessBody<T> {
  return { data, meta: { version: API_VERSION, ...meta } };
}

export function errorBody(error: ApiError): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
    meta: { version: API_VERSION },
  };
}

/**
 * `no-store` matters more than it looks: these routes sit behind the same CDN
 * as the marketing pages, and responses vary by bearer token rather than by
 * cookie, so a shared cache could otherwise serve one user's data to another.
 */
const BASE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  Vary: "Authorization",
};

export function jsonSuccess<T>(
  data: T,
  options?: { status?: number; meta?: Omit<ApiMeta, "version"> }
): Response {
  return new Response(JSON.stringify(successBody(data, options?.meta)), {
    status: options?.status ?? 200,
    headers: BASE_HEADERS,
  });
}

export function jsonError(error: ApiError): Response {
  const headers = { ...BASE_HEADERS };

  // Lets a client distinguish "refresh the token and retry" from "sign in
  // again" without parsing the body.
  if (error.code === "token_expired") {
    headers["WWW-Authenticate"] =
      'Bearer error="invalid_token", error_description="expired"';
  } else if (error.code === "unauthorized") {
    headers["WWW-Authenticate"] = "Bearer";
  }

  return new Response(JSON.stringify(errorBody(error)), {
    status: error.status,
    headers,
  });
}
