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

import { badRequest } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { requestPasswordResetEmail } from "@/lib/api/queries/auth-mutations";
import { jsonSuccess } from "@/lib/api/response";

export const POST = apiHandler(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.email !== "string") {
    throw badRequest("email is required.");
  }
  if (typeof body.redirectTo !== "string" || body.redirectTo.trim().length === 0) {
    throw badRequest("redirectTo is required.");
  }

  return jsonSuccess(
    await requestPasswordResetEmail({
      email: body.email,
      redirectTo: body.redirectTo.trim(),
    })
  );
});
