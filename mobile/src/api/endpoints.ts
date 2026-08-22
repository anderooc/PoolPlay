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

import type {
  TournamentDetailContract,
  TournamentListContract,
  TournamentMatchDetailContract,
  TournamentMatchListContract,
  TournamentPlayContract,
  TournamentTeamListContract,
} from "@/lib/api/contracts/tournament";
import type { ViewerContract } from "@/lib/api/contracts/viewer";
import { apiRequest } from "./client";

/*
 * Response types come from the web project's contract modules, so a change to
 * the wire format shows up as a compile error here rather than as a runtime
 * surprise on a device.
 */

export function fetchViewer(signal?: AbortSignal): Promise<ViewerContract> {
  return apiRequest<ViewerContract>("/api/v1/me", { signal });
}

/**
 * A type alias rather than an interface: only aliases get an implicit index
 * signature, which is what lets this be passed straight through as query params.
 */
export type TournamentListParams = {
  status?: string;
  gender?: string;
  region?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export function fetchTournaments(
  params: TournamentListParams = {},
  signal?: AbortSignal
): Promise<TournamentListContract> {
  return apiRequest<TournamentListContract>("/api/v1/tournaments", {
    query: params,
    // Browsing works before sign-in, matching the public web /explore page.
    authenticated: false,
    signal,
  });
}

function tournamentPath(slug: string, suffix = ""): string {
  return `/api/v1/tournaments/${encodeURIComponent(slug)}${suffix}`;
}

export function fetchTournament(
  slug: string,
  signal?: AbortSignal
): Promise<TournamentDetailContract> {
  return apiRequest<TournamentDetailContract>(tournamentPath(slug), {
    authenticated: false,
    signal,
  });
}

export function fetchTournamentTeams(
  slug: string,
  signal?: AbortSignal
): Promise<TournamentTeamListContract> {
  return apiRequest<TournamentTeamListContract>(tournamentPath(slug, "/teams"), {
    authenticated: false,
    signal,
  });
}

export function fetchTournamentMatches(
  slug: string,
  signal?: AbortSignal
): Promise<TournamentMatchListContract> {
  return apiRequest<TournamentMatchListContract>(
    tournamentPath(slug, "/matches"),
    {
      authenticated: false,
      signal,
    }
  );
}

export function fetchTournamentPlay(
  slug: string,
  signal?: AbortSignal
): Promise<TournamentPlayContract> {
  return apiRequest<TournamentPlayContract>(tournamentPath(slug, "/play"), {
    authenticated: false,
    signal,
  });
}

export function fetchTournamentMatch(
  tournamentSlug: string,
  matchSlug: string,
  signal?: AbortSignal
): Promise<TournamentMatchDetailContract> {
  return apiRequest<TournamentMatchDetailContract>(
    tournamentPath(
      tournamentSlug,
      `/matches/${encodeURIComponent(matchSlug)}`
    ),
    {
      authenticated: false,
      signal,
    }
  );
}
