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

import type { TournamentMatchListContract } from "@/lib/api/contracts/tournament";
import { apiHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import {
  findPostedTournamentId,
  loadPublicTournamentMatches,
} from "@/lib/api/queries/tournament-detail";
import { jsonSuccess } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * Matches from divisions the host has released. Unreleased pool/bracket work
 * stays off the public payload, matching the web participant view.
 */
export const GET = apiHandler(async (_request: Request, context: RouteContext) => {
  const { slug } = await context.params;
  const tournament = await findPostedTournamentId(slug);
  if (!tournament) throw notFound("Tournament not found.");

  const body: TournamentMatchListContract = {
    matches: await loadPublicTournamentMatches(tournament.id),
  };
  return jsonSuccess(body);
});
