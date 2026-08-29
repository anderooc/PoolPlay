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

import type { AppUser } from "@/lib/auth";
import { requireViewer } from "@/lib/api/auth";
import { badRequest } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import type { MatchConsoleMutationResultContract } from "@/lib/api/contracts/match-console";
import {
  loadMatchConsoleForViewer,
  resolveMatchIdForViewer,
} from "@/lib/api/queries/match-console";
import {
  claimPointKeeperForViewer,
  claimRefCrewSlotForViewer,
  releasePointKeeperForViewer,
  releaseRefCrewSlotForViewer,
} from "@/lib/api/queries/match-ref-crew-mutations";
import { parseMatchRefCrewRole } from "@/lib/tournaments/match-ref-crew";
import { jsonSuccess } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ slug: string; matchSlug: string }>;
}

async function crewMutationResponse(
  tournamentSlug: string,
  matchSlug: string,
  user: AppUser,
  run: (matchId: string) => Promise<unknown>
): Promise<MatchConsoleMutationResultContract> {
  const matchId = await resolveMatchIdForViewer(tournamentSlug, matchSlug, user);
  await run(matchId);
  return {
    success: true,
    console: await loadMatchConsoleForViewer(tournamentSlug, matchSlug, user),
  };
}

export const POST = apiHandler(
  async (request: Request, context: RouteContext) => {
    const { user } = await requireViewer(request);
    const { slug, matchSlug } = await context.params;
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const action = body?.action;

    if (action === "claim") {
      const role = parseMatchRefCrewRole(body?.role);
      if (role === "invalid") {
        throw badRequest("role is required.");
      }
      return jsonSuccess(
        await crewMutationResponse(slug, matchSlug, user, (matchId) =>
          claimRefCrewSlotForViewer(matchId, role, user)
        )
      );
    }

    if (action === "release") {
      return jsonSuccess(
        await crewMutationResponse(slug, matchSlug, user, (matchId) =>
          releaseRefCrewSlotForViewer(matchId, user)
        )
      );
    }

    if (action === "claim_point_keeper") {
      return jsonSuccess(
        await crewMutationResponse(slug, matchSlug, user, (matchId) =>
          claimPointKeeperForViewer(matchId, user)
        )
      );
    }

    if (action === "release_point_keeper") {
      return jsonSuccess(
        await crewMutationResponse(slug, matchSlug, user, (matchId) =>
          releasePointKeeperForViewer(matchId, user)
        )
      );
    }

    throw badRequest(
      "action must be claim, release, claim_point_keeper, or release_point_keeper."
    );
  }
);
