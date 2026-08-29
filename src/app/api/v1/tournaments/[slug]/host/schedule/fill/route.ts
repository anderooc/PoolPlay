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
  applyTournamentHostScheduleFill,
  previewTournamentHostScheduleFill,
} from "@/lib/api/queries/tournament-host-schedule";
import { jsonSuccess } from "@/lib/api/response";
import type { TournamentHostScheduleScopeContract } from "@/lib/api/contracts/tournament-host";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

function parseScope(body: Record<string, unknown>): TournamentHostScheduleScopeContract {
  const scope = body.scope as Record<string, unknown> | undefined;
  if (!scope || typeof scope.type !== "string") {
    throw badRequest("Provide scope.");
  }
  if (
    scope.type === "division-pools" &&
    typeof scope.divisionId === "string"
  ) {
    return { type: "division-pools", divisionId: scope.divisionId };
  }
  if (scope.type === "bracket" && typeof scope.bracketId === "string") {
    return { type: "bracket", bracketId: scope.bracketId };
  }
  throw badRequest("Invalid schedule scope.");
}

export const POST = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) throw badRequest("Invalid request body.");

  const scope = parseScope(body);
  const firstStartIso =
    typeof body.firstStartIso === "string" ? body.firstStartIso : "";
  const intervalMinutes =
    typeof body.intervalMinutes === "number" ? body.intervalMinutes : 60;
  const overwrite = body.overwrite === true;
  const preview = body.preview === true;

  if (!firstStartIso) throw badRequest("Provide firstStartIso.");

  if (preview) {
    return jsonSuccess(
      await previewTournamentHostScheduleFill(
        slug,
        user,
        scope,
        firstStartIso,
        intervalMinutes,
        overwrite
      )
    );
  }

  return jsonSuccess(
    await applyTournamentHostScheduleFill(
      slug,
      user,
      scope,
      firstStartIso,
      intervalMinutes,
      overwrite
    )
  );
});
