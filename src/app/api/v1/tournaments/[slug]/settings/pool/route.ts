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
  loadTournamentPoolSettings,
  updateTournamentPoolSettingsForViewer,
} from "@/lib/api/queries/tournament-host-settings";
import { requirePostedTournament } from "@/lib/api/queries/tournament-ops";
import { jsonSuccess } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug } = await context.params;
  const tournament = await requirePostedTournament(slug);
  return jsonSuccess(await loadTournamentPoolSettings(tournament, user));
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
    typeof body.matchFormat !== "string" ||
    typeof body.warmupFormat !== "string" ||
    typeof body.setStartingScore !== "number" ||
    typeof body.setTargetScore !== "number" ||
    typeof body.tiebreakTargetScore !== "number" ||
    !Array.isArray(body.poolTiebreakCriteria) ||
    !body.poolTiebreakCriteria.every((value) => typeof value === "string")
  ) {
    throw badRequest("Invalid pool settings payload.");
  }
  return jsonSuccess(
    await updateTournamentPoolSettingsForViewer(slug, user, {
      matchFormat: body.matchFormat,
      setStartingScore: body.setStartingScore,
      setTargetScore: body.setTargetScore,
      tiebreakTargetScore: body.tiebreakTargetScore,
      warmupFormat: body.warmupFormat,
      poolTiebreakCriteria: body.poolTiebreakCriteria,
    })
  );
});
