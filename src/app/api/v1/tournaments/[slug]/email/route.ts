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
import { apiHandler } from "@/lib/api/handler";
import {
  loadTournamentEmail,
  requirePostedTournament,
} from "@/lib/api/queries/tournament-ops";
import { jsonSuccess } from "@/lib/api/response";
import { sendCustomEmailForOrganizer } from "@/lib/api/queries/tournament-ops-mutations";
import { badRequest } from "@/lib/api/errors";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug } = await context.params;
  const tournament = await requirePostedTournament(slug);
  return jsonSuccess(await loadTournamentEmail(tournament, user));
});

export const POST = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (
    !body ||
    typeof body.audience !== "string" ||
    typeof body.subject !== "string" ||
    typeof body.body !== "string"
  ) {
    throw badRequest("audience, subject, and body are required.");
  }
  return jsonSuccess(
    await sendCustomEmailForOrganizer(slug, user, {
      audience: body.audience,
      subject: body.subject,
      body: body.body,
    })
  );
});
