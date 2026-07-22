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

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tournamentEmailSends } from "@/lib/db/schema";
import { TournamentMessagesPanel } from "../messages-panel";

export async function TournamentMessagesTabPanel({
  tournamentId,
  waiverEnabled,
  canEdit,
  lockedReason,
}: {
  tournamentId: string;
  waiverEnabled: boolean;
  canEdit: boolean;
  lockedReason?: string | null;
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
      canEdit={canEdit}
      lockedReason={lockedReason}
    />
  );
}
