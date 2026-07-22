/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers, tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { userCanAccessTournamentWaiver } from "@/lib/tournaments/waiver-access";
import { getLatestTournamentWaiver } from "@/lib/tournaments/waiver-compliance";
import { downloadTournamentWaiverPdf } from "@/lib/tournaments/waiver-storage";
import { contentDispositionHeader } from "@/lib/security/content-disposition";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to download the waiver." }, { status: 401 });
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const memberRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id));

  const canAccess = await userCanAccessTournamentWaiver(
    tournament,
    user,
    new Set(memberRows.map((r) => r.teamId))
  );

  if (!canAccess) {
    return NextResponse.json(
      { error: "Only registered teams and the organizer can download this waiver." },
      { status: 403 }
    );
  }

  const waiver = await getLatestTournamentWaiver(tournament.id);
  if (!waiver) {
    return NextResponse.json({ error: "No waiver uploaded yet." }, { status: 404 });
  }

  try {
    const bytes = await downloadTournamentWaiverPdf(waiver.storagePath);
    const filename = waiver.fileName || `${slug}-waiver.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDispositionHeader(filename, {
          fallback: `${slug}-waiver.pdf`,
        }),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load waiver PDF. Check storage configuration." },
      { status: 500 }
    );
  }
}
