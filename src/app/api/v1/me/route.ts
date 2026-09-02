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

import { requireViewer } from "@/lib/api/auth";
import { badRequest } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { buildViewerContract } from "@/lib/api/projections/viewer";
import { updateProfileForViewer } from "@/lib/api/queries/viewer-mutations";
import { jsonSuccess } from "@/lib/api/response";

export const GET = apiHandler(async (request: Request) => {
  const { user } = await requireViewer(request);
  return jsonSuccess(buildViewerContract(user));
});

export const PATCH = apiHandler(async (request: Request) => {
  const { user } = await requireViewer(request);
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.fullName !== "string") {
    throw badRequest("fullName is required.");
  }
  return jsonSuccess(
    await updateProfileForViewer(user, {
      fullName: body.fullName,
      playerGender:
        body.playerGender === null || typeof body.playerGender === "string"
          ? body.playerGender
          : undefined,
      volleyballPosition:
        body.volleyballPosition === null ||
        typeof body.volleyballPosition === "string"
          ? body.volleyballPosition
          : undefined,
      jerseyNumber:
        body.jerseyNumber === null || typeof body.jerseyNumber === "string"
          ? body.jerseyNumber
          : undefined,
    })
  );
});
