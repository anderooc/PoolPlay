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

import type { TournamentListContract } from "@/lib/api/contracts/tournament";
import { apiHandler } from "@/lib/api/handler";
import { buildTournamentListItemContract } from "@/lib/api/projections/tournament";
import {
  applyTournamentListQuery,
  parseTournamentListQuery,
} from "@/lib/api/queries/tournament-list";
import { jsonSuccess } from "@/lib/api/response";
import { getCachedPublicTournamentList } from "@/lib/tournaments/public-list-cache";

/**
 * Public tournament list, mirroring /explore. Intentionally unauthenticated so
 * the app's browse tab works before sign-in; the underlying loader already
 * excludes drafts and returns a projection with no internal identifiers.
 */
export const GET = apiHandler(async (request: Request) => {
  const query = parseTournamentListQuery(new URL(request.url).searchParams);
  const page = applyTournamentListQuery(
    await getCachedPublicTournamentList(),
    query
  );

  const body: TournamentListContract = {
    tournaments: page.items.map(buildTournamentListItemContract),
    total: page.total,
  };

  return jsonSuccess(body, {
    meta: { cursor: { next: page.nextOffset?.toString() ?? null } },
  });
});
