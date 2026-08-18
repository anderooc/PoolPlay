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

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tournamentEmailSends } from "@/lib/db/schema";
import { TournamentMessagesPanel } from "../messages-panel";
import { countRecentPostingAnnouncements, listRecentPostingAnnouncements } from "@/lib/tournaments/send-posting-announcement";
import type { TeamGender, TeamRegion } from "@/types";

export async function TournamentMessagesTabPanel({
  tournamentId,
  tournamentName,
  tournamentDate,
  location,
  gender,
  region,
  status,
  waiverEnabled,
  canEdit,
  lockedReason,
}: {
  tournamentId: string;
  tournamentName: string;
  tournamentDate: string;
  location: string;
  gender: TeamGender;
  region: TeamRegion;
  status: string;
  waiverEnabled: boolean;
  canEdit: boolean;
  lockedReason?: string | null;
}) {
  const [sendHistory, postingHistory, recentAnnouncementCount] = await Promise.all([
    db
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
      .limit(20),
    listRecentPostingAnnouncements(tournamentId),
    countRecentPostingAnnouncements(tournamentId),
  ]);

  return (
    <TournamentMessagesPanel
      tournamentId={tournamentId}
      tournamentName={tournamentName}
      tournamentDate={tournamentDate}
      location={location}
      gender={gender}
      region={region}
      status={status}
      waiverEnabled={waiverEnabled}
      sendHistory={sendHistory}
      postingHistory={postingHistory}
      recentAnnouncementCount={recentAnnouncementCount}
      canEdit={canEdit}
      lockedReason={lockedReason}
    />
  );
}
