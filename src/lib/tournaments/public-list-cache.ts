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

import { unstable_cache } from "next/cache";
import { PUBLIC_TOURNAMENTS_CACHE_TAG } from "./public-cache";
import { loadPublicTournamentList } from "./public-list-loader";

/**
 * Shared by the /explore page and the public tournaments API so both read one
 * cache entry and are invalidated by the same tag. Defining this per call site
 * would silently create independent caches that drift apart.
 *
 * Migrating to the `use cache` directive is blocked on enabling Cache
 * Components for the whole app.
 */
export const getCachedPublicTournamentList = unstable_cache(
  () => loadPublicTournamentList(),
  ["public-tournaments"],
  { revalidate: 60, tags: [PUBLIC_TOURNAMENTS_CACHE_TAG] }
);
