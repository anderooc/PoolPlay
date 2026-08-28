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

import { renderToBuffer } from "@react-pdf/renderer";
import { requireViewer } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import {
  loadViewerTeamMembership,
  requirePostedTournament,
} from "@/lib/api/queries/tournament-ops";
import { gatherPacketData } from "@/lib/tournaments/packet-data";
import { userCanDownloadTournamentPacket } from "@/lib/tournaments/packet-access";
import { TournamentPacketDocument } from "@/lib/tournaments/packet-pdf";
import { contentDispositionHeader } from "@/lib/security/content-disposition";
import { forbidden } from "@/lib/api/errors";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (request: Request, context: RouteContext) => {
  const { user } = await requireViewer(request);
  const { slug } = await context.params;
  const tournament = await requirePostedTournament(slug);
  const { teamIds } = await loadViewerTeamMembership(user.id);
  const canDownload = await userCanDownloadTournamentPacket(
    tournament,
    user,
    new Set(teamIds)
  );
  if (!canDownload) {
    throw forbidden("Only registered teams and the organizer can download this packet.");
  }

  const data = await gatherPacketData(tournament.id);
  if (!data) throw notFound("Tournament not found.");

  const buffer = await renderToBuffer(
    <TournamentPacketDocument data={data} />
  );
  const filename = `${slug}-packet.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionHeader(filename, {
        fallback: "tournament-packet.pdf",
      }),
      "Cache-Control": "no-store, private",
      Vary: "Authorization",
    },
  });
});
