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

import { toApiError } from "./errors";
import { jsonError } from "./response";

/**
 * Wraps a route handler so every thrown value becomes a structured JSON error
 * instead of Next's default HTML error page — a mobile client parsing JSON
 * should never receive a document.
 *
 * Generic over the context parameter so callers keep Next's typed
 * `RouteContext<'/path'>` params.
 */
export function apiHandler<Context>(
  handler: (request: Request, context: Context) => Promise<Response>
): (request: Request, context: Context) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (cause) {
      const error = toApiError(cause);

      // Only genuinely unexpected failures are worth logging; the mapped 4xx
      // errors are normal control flow.
      if (error.code === "internal_error") {
        console.error("[api] unhandled error", cause);
      }

      return jsonError(error);
    }
  };
}
