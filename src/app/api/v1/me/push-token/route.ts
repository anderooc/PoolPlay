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
import {
  registerPushTokenForViewer,
  unregisterPushTokenForViewer,
} from "@/lib/api/queries/push-token";
import { jsonSuccess } from "@/lib/api/response";

export const POST = apiHandler(async (request: Request) => {
  const { user } = await requireViewer(request);
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.token !== "string") {
    throw badRequest("Provide token.");
  }

  return jsonSuccess(
    await registerPushTokenForViewer(user, {
      token: body.token,
      platform: typeof body.platform === "string" ? body.platform : undefined,
      deviceName:
        body.deviceName === null || typeof body.deviceName === "string"
          ? body.deviceName
          : undefined,
    })
  );
});

export const DELETE = apiHandler(async (request: Request) => {
  const { user } = await requireViewer(request);
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.token !== "string") {
    throw badRequest("Provide token.");
  }

  return jsonSuccess(await unregisterPushTokenForViewer(user, body.token));
});
