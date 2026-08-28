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
import { forbidden, notFound } from "@/lib/api/errors";
import {
  loadViewerTeamMembership,
  requirePostedTournament,
} from "@/lib/api/queries/tournament-ops";
import { userCanAccessTournamentWaiver } from "@/lib/tournaments/waiver-access";
import { getLatestTournamentWaiver } from "@/lib/tournaments/waiver-compliance";
import { downloadTournamentWaiverPdf } from "@/lib/tournaments/waiver-storage";
import { contentDispositionHeader } from "@/lib/security/content-disposition";
import { resolveIsTournamentOrganizer } from "@/lib/tournaments/permissions";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug } = await context.params;
  const tournament = await requirePostedTournament(slug);
  const { teamIds } = await loadViewerTeamMembership(user.id);
  const isOrganizer = await resolveIsTournamentOrganizer(tournament, user);
  const canAccess = await userCanAccessTournamentWaiver(
    tournament,
    user,
    new Set(teamIds)
  );
  if (!isOrganizer && !canAccess) {
    throw forbidden(
      "Only registered teams and the organizer can download this waiver."
    );
  }

  const waiver = await getLatestTournamentWaiver(tournament.id);
  if (!waiver) throw notFound("No waiver uploaded yet.");

  const bytes = await downloadTournamentWaiverPdf(waiver.storagePath);
  const filename = waiver.fileName || `${slug}-waiver.pdf`;

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionHeader(filename, {
        fallback: `${slug}-waiver.pdf`,
      }),
      "Cache-Control": "no-store, private",
      Vary: "Authorization",
    },
  });
});
