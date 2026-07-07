import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tournamentEmailSends } from "@/lib/db/schema";
import { TournamentMessagesPanel } from "../messages-panel";

export async function TournamentMessagesTabPanel({
  tournamentId,
  waiverEnabled,
}: {
  tournamentId: string;
  waiverEnabled: boolean;
}) {
  const sendHistory = await db
    .select({
      id: tournamentEmailSends.id,
      kind: tournamentEmailSends.kind,
      audience: tournamentEmailSends.audience,
      subject: tournamentEmailSends.subject,
      recipientCount: tournamentEmailSends.recipientCount,
      skippedNoCaptainCount: tournamentEmailSends.skippedNoCaptainCount,
      sentAt: tournamentEmailSends.sentAt,
    })
    .from(tournamentEmailSends)
    .where(eq(tournamentEmailSends.tournamentId, tournamentId))
    .orderBy(desc(tournamentEmailSends.sentAt))
    .limit(20);

  return (
    <TournamentMessagesPanel
      tournamentId={tournamentId}
      waiverEnabled={waiverEnabled}
      sendHistory={sendHistory}
    />
  );
}
