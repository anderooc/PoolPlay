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
import { apiHandler } from "@/lib/api/handler";
import { loadTeamDetailForViewer } from "@/lib/api/queries/teams";
import { jsonSuccess } from "@/lib/api/response";

export const GET = apiHandler(
  async (
    request: Request,
    context: { params: Promise<{ slug: string }> }
  ) => {
    const { user } = await requireViewer(request);
    const { slug } = await context.params;
    return jsonSuccess(await loadTeamDetailForViewer(slug, user));
  }
);
