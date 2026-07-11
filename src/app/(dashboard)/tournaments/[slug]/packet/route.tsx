import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers, tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { gatherPacketData } from "@/lib/tournaments/packet-data";
import { userCanDownloadTournamentPacket } from "@/lib/tournaments/packet-access";
import { TournamentPacketDocument } from "@/lib/tournaments/packet-pdf";
import { contentDispositionHeader } from "@/lib/security/content-disposition";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const preview = new URL(request.url).searchParams.get("preview") === "1";

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in and register to download the tournament packet." },
      { status: 401 }
    );
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

  const canDownload = await userCanDownloadTournamentPacket(
    tournament,
    user,
    new Set(memberRows.map((r) => r.teamId))
  );

  if (!canDownload) {
    return NextResponse.json(
      { error: "Only registered teams and the organizer can download this packet." },
      { status: 403 }
    );
  }

  const data = await gatherPacketData(tournament.id);
  if (!data) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    <TournamentPacketDocument data={data} />
  );

  const filename = `${slug}-packet.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionHeader(filename, {
        inline: preview,
        fallback: "tournament-packet.pdf",
      }),
      "Cache-Control": "no-store",
    },
  });
}
