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
import { addTeamMemberForViewer } from "@/lib/api/queries/team-ops-mutations";
import { jsonSuccess } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const POST = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) throw badRequest("Request body is required.");
  return jsonSuccess(
    await addTeamMemberForViewer(slug, user, {
      email: typeof body.email === "string" ? body.email : undefined,
      userId: typeof body.userId === "string" ? body.userId : undefined,
      jerseyNumber:
        typeof body.jerseyNumber === "string" || body.jerseyNumber === null
          ? (body.jerseyNumber as string | null)
          : undefined,
    })
  );
});
