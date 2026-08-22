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

import { type ApiErrorCode } from "./contracts/envelope";

export { API_ERROR_CODES, type ApiErrorCode } from "./contracts/envelope";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  token_expired: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
};

export function statusForErrorCode(code: ApiErrorCode): number {
  return STATUS_BY_CODE[code];
}

/**
 * Thrown anywhere inside a route handler to produce a structured response.
 * `details` is for field-level validation output and must never carry
 * internal diagnostics, since the whole payload reaches the client.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string[]>;

  constructor(
    code: ApiErrorCode,
    message: string,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return statusForErrorCode(this.code);
  }
}

export function badRequest(
  message: string,
  details?: Record<string, string[]>
): ApiError {
  return new ApiError("bad_request", message, details);
}

export function unauthorized(message = "Authentication required."): ApiError {
  return new ApiError("unauthorized", message);
}

export function tokenExpired(
  message = "Access token expired. Refresh and retry."
): ApiError {
  return new ApiError("token_expired", message);
}

export function forbidden(
  message = "You do not have access to this resource."
): ApiError {
  return new ApiError("forbidden", message);
}

export function notFound(message = "Resource not found."): ApiError {
  return new ApiError("not_found", message);
}

/**
 * Normalizes anything thrown inside a handler into an ApiError. The existing
 * server-side helpers (`requireUser`, `requireAdmin`) signal with plain
 * `Error("Unauthorized")` / `Error("Forbidden")`, so those are mapped rather
 * than leaking as 500s. Everything else collapses to a generic internal error
 * so unexpected messages never reach a client.
 */
export function toApiError(cause: unknown): ApiError {
  if (cause instanceof ApiError) return cause;

  if (cause instanceof Error) {
    if (cause.message === "Unauthorized") return unauthorized();
    if (cause.message === "Forbidden") return forbidden();
  }

  return new ApiError("internal_error", "Something went wrong.");
}
