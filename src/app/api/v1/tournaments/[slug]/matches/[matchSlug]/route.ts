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

import { notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import {
  findPostedTournamentId,
  loadPublicTournamentMatch,
} from "@/lib/api/queries/tournament-detail";
import { jsonSuccess } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ slug: string; matchSlug: string }>;
}

/**
 * One released match. Hidden the same way as the list: drafts and
 * unreleased divisions are 404s, never UUIDs.
 */
export const GET = apiHandler(async (_request: Request, context: RouteContext) => {
  const { slug, matchSlug } = await context.params;
  const tournament = await findPostedTournamentId(slug);
  if (!tournament) throw notFound("Tournament not found.");

  const match = await loadPublicTournamentMatch(
    tournament.id,
    tournament.name,
    matchSlug
  );
  if (!match) throw notFound("Match not found.");

  return jsonSuccess(match);
});
