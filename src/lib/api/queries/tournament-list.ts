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

import { z } from "zod";
import { TEAM_GENDERS, TEAM_REGIONS } from "@/lib/constants/team";
import type { PublicTournamentListItem } from "@/lib/tournaments/public-list-projection";
import { badRequest } from "../errors";

/**
 * Draft tournaments never leave the loader, so they are not offerable as a
 * filter value — accepting the word would imply the API can return them.
 */
const FILTERABLE_STATUSES = [
  "registration_open",
  "registration_closed",
  "in_progress",
  "completed",
] as const;

export const DEFAULT_TOURNAMENT_PAGE_SIZE = 20;
export const MAX_TOURNAMENT_PAGE_SIZE = 100;

const querySchema = z.object({
  status: z.enum(FILTERABLE_STATUSES).optional(),
  gender: z.enum(TEAM_GENDERS).optional(),
  region: z.enum(TEAM_REGIONS).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_TOURNAMENT_PAGE_SIZE)
    .default(DEFAULT_TOURNAMENT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export type TournamentListQuery = z.infer<typeof querySchema>;

export interface TournamentListPage {
  items: PublicTournamentListItem[];
  total: number;
  nextOffset: number | null;
}

/**
 * Absent params fall through to defaults, but a param that is present and
 * invalid is an error rather than being silently ignored — a client sending
 * `limit=abc` has a bug, and returning 20 results anyway hides it.
 */
export function parseTournamentListQuery(
  params: URLSearchParams
): TournamentListQuery {
  const raw: Record<string, string> = {};
  for (const key of ["status", "gender", "region", "search", "limit", "offset"]) {
    const value = params.get(key);
    if (value !== null && value !== "") raw[key] = value;
  }

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    const details: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || "query";
      (details[field] ??= []).push(issue.message);
    }
    throw badRequest("Invalid query parameters.", details);
  }

  return parsed.data;
}

export function applyTournamentListQuery(
  items: PublicTournamentListItem[],
  query: TournamentListQuery
): TournamentListPage {
  const needle = query.search?.toLowerCase();

  const filtered = items.filter((item) => {
    if (query.status && item.status !== query.status) return false;
    if (query.gender && item.gender !== query.gender) return false;
    if (query.region && item.region !== query.region) return false;
    if (needle) {
      const haystack = `${item.name} ${item.location} ${
        item.hostSchool?.name ?? ""
      }`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const page = filtered.slice(query.offset, query.offset + query.limit);
  const consumed = query.offset + page.length;

  return {
    items: page,
    total: filtered.length,
    nextOffset: consumed < filtered.length ? consumed : null,
  };
}
