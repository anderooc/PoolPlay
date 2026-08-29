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
import {
  loadMatchConsoleForViewer,
  resolveMatchIdForViewer,
} from "@/lib/api/queries/match-console";
import {
  finalizeMatchForViewer,
  pauseMatchForViewer,
  reopenMatchForViewer,
  saveSetScoreForViewer,
  startMatchForViewer,
  startWarmupForViewer,
} from "@/lib/api/queries/match-scoring-mutations";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jsonSuccess } from "@/lib/api/response";
import type { MatchConsoleMutationResultContract } from "@/lib/api/contracts/match-console";

interface RouteContext {
  params: Promise<{ slug: string; matchSlug: string }>;
}

async function mutationResponse(
  tournamentSlug: string,
  matchSlug: string,
  user: AppUser,
  run: (matchId: string) => Promise<void>
): Promise<MatchConsoleMutationResultContract> {
  const matchId = await resolveMatchIdForViewer(tournamentSlug, matchSlug, user);
  await run(matchId);
  const matchConsole = await loadMatchConsoleForViewer(
    tournamentSlug,
    matchSlug,
    user
  );
  return { success: true, console: matchConsole };
}

export const GET = apiHandler(
  async (request: Request, context: RouteContext) => {
    const { user } = await requireViewer(request);
    const { slug, matchSlug } = await context.params;
    return jsonSuccess(
      await loadMatchConsoleForViewer(slug, matchSlug, user)
    );
  }
);

export const POST = apiHandler(
  async (request: Request, context: RouteContext) => {
    const { user } = await requireViewer(request);
    const { slug, matchSlug } = await context.params;
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const action = body?.action;

    if (action === "warmup") {
      return jsonSuccess(
        await mutationResponse(slug, matchSlug, user, (matchId) =>
          startWarmupForViewer(matchId, user)
        )
      );
    }

    if (action === "start") {
      return jsonSuccess(
        await mutationResponse(slug, matchSlug, user, (matchId) =>
          startMatchForViewer(matchId, user)
        )
      );
    }

    if (action === "pause") {
      return jsonSuccess(
        await mutationResponse(slug, matchSlug, user, (matchId) =>
          pauseMatchForViewer(matchId, user)
        )
      );
    }

    if (action === "reopen") {
      return jsonSuccess(
        await mutationResponse(slug, matchSlug, user, (matchId) =>
          reopenMatchForViewer(matchId, user)
        )
      );
    }

    if (action === "finalize") {
      const winnerSlug =
        typeof body?.winnerSlug === "string" ? body.winnerSlug : null;
      let winnerId: string | null = null;
      if (winnerSlug) {
        const [team] = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.slug, winnerSlug))
          .limit(1);
        if (!team) throw badRequest("Winner team not found.");
        winnerId = team.id;
      }

      return jsonSuccess(
        await mutationResponse(slug, matchSlug, user, (matchId) =>
          finalizeMatchForViewer(matchId, winnerId, user)
        )
      );
    }

    throw badRequest(
      "action must be warmup, start, pause, finalize, or reopen."
    );
  }
);
