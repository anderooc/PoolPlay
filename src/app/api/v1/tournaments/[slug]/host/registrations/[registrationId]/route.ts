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
  setTournamentHostRegistrationDivision,
  updateTournamentHostRegistrationStatus,
} from "@/lib/api/queries/tournament-host-registrations";
import { jsonSuccess } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ slug: string; registrationId: string }>;
}

export const PATCH = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug, registrationId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) throw badRequest("Invalid request body.");

  if (typeof body.status === "string") {
    if (
      body.status !== "pending" &&
      body.status !== "confirmed" &&
      body.status !== "checked_in"
    ) {
      throw badRequest("Invalid registration status.");
    }
    return jsonSuccess(
      await updateTournamentHostRegistrationStatus(
        slug,
        user,
        registrationId,
        body.status
      )
    );
  }

  const divisionId =
    body.divisionId === null
      ? null
      : typeof body.divisionId === "string"
        ? body.divisionId
        : undefined;
  if (divisionId === undefined) {
    throw badRequest("Provide status or divisionId.");
  }

  return jsonSuccess(
    await setTournamentHostRegistrationDivision(
      slug,
      user,
      registrationId,
      divisionId
    )
  );
});
