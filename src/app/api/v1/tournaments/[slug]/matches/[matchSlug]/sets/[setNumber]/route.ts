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
  loadMatchConsoleForViewer,
  resolveMatchIdForViewer,
} from "@/lib/api/queries/match-console";
import { saveSetScoreForViewer } from "@/lib/api/queries/match-scoring-mutations";
import { jsonSuccess } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ slug: string; matchSlug: string; setNumber: string }>;
}

export const PUT = apiHandler(
  async (request: Request, context: RouteContext) => {
    const { user } = await requireViewer(request);
    const { slug, matchSlug, setNumber: setNumberRaw } = await context.params;
    const setNumber = Number.parseInt(setNumberRaw, 10);
    if (!Number.isFinite(setNumber) || setNumber < 1) {
      throw badRequest("setNumber must be a positive integer.");
    }

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) throw badRequest("Invalid request body.");

    const teamAScore = body.teamAScore;
    const teamBScore = body.teamBScore;
    if (typeof teamAScore !== "number" || typeof teamBScore !== "number") {
      throw badRequest("teamAScore and teamBScore are required numbers.");
    }

    const matchId = await resolveMatchIdForViewer(slug, matchSlug, user);
    await saveSetScoreForViewer(
      matchId,
      setNumber,
      teamAScore,
      teamBScore,
      user
    );

    return jsonSuccess({
      success: true as const,
      console: await loadMatchConsoleForViewer(slug, matchSlug, user),
    });
  }
);
