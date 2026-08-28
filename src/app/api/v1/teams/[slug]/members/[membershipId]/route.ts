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
  removeTeamMemberForViewer,
  updateTeamMemberJerseyForViewer,
  updateTeamMemberVolleyballPositionForViewer,
} from "@/lib/api/queries/team-ops-mutations";
import { jsonSuccess } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ slug: string; membershipId: string }>;
}

export const PATCH = apiHandler(
  async (request: Request, context: RouteContext) => {
    const { user } = await requireViewer(request);
    const { slug, membershipId } = await context.params;
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      throw badRequest("Invalid request body.");
    }

    if ("volleyballPosition" in body) {
      const raw = body.volleyballPosition;
      const volleyballPosition =
        raw === null || raw === ""
          ? null
          : typeof raw === "string"
            ? raw
            : null;
      if (raw !== null && raw !== "" && typeof raw !== "string") {
        throw badRequest("volleyballPosition must be a string or null.");
      }
      return jsonSuccess(
        await updateTeamMemberVolleyballPositionForViewer(
          slug,
          membershipId,
          user,
          volleyballPosition
        )
      );
    }

    if (!("jerseyNumber" in body)) {
      throw badRequest("Provide jerseyNumber or volleyballPosition to update.");
    }
    const raw = body.jerseyNumber;
    let jerseyNumber: number | null;
    if (raw === null || raw === "") {
      jerseyNumber = null;
    } else if (typeof raw === "number") {
      jerseyNumber = raw;
    } else if (typeof raw === "string") {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) {
        throw badRequest("jerseyNumber must be a number or null.");
      }
      jerseyNumber = parsed;
    } else {
      throw badRequest("jerseyNumber must be a number or null.");
    }
    return jsonSuccess(
      await updateTeamMemberJerseyForViewer(
        slug,
        membershipId,
        user,
        jerseyNumber
      )
    );
  }
);

export const DELETE = apiHandler(
  async (request: Request, context: RouteContext) => {
    const { user } = await requireViewer(request);
    const { slug, membershipId } = await context.params;
    return jsonSuccess(
      await removeTeamMemberForViewer(slug, membershipId, user)
    );
  }
);
