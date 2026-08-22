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

import { apiHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { buildTournamentDetailContract } from "@/lib/api/projections/tournament";
import {
  findPublicTournamentBySlug,
  loadPublicTournamentExtras,
} from "@/lib/api/queries/tournament-detail";
import { jsonSuccess } from "@/lib/api/response";
import { getCachedPublicTournamentList } from "@/lib/tournaments/public-list-cache";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * Public tournament detail. Same visibility as the list: drafts never appear,
 * and the payload carries no internal identifiers.
 */
export const GET = apiHandler(async (_request: Request, context: RouteContext) => {
  const { slug } = await context.params;
  const item = findPublicTournamentBySlug(
    await getCachedPublicTournamentList(),
    slug
  );
  if (!item) throw notFound("Tournament not found.");

  const extras = await loadPublicTournamentExtras(slug);
  if (!extras) throw notFound("Tournament not found.");

  return jsonSuccess(buildTournamentDetailContract(item, extras));
});
