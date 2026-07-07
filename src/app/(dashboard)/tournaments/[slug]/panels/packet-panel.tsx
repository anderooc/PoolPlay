import { TournamentPacketPanel } from "../packet-panel";

export function TournamentPacketTabPanel({
  tournamentId,
  slug,
  packetNotes,
  canEdit,
  lockedReason,
}: {
  tournamentId: string;
  slug: string;
  packetNotes: string | null;
  canEdit: boolean;
  lockedReason?: string | null;
}) {
  return (
    <TournamentPacketPanel
      tournamentId={tournamentId}
      slug={slug}
      initialPacketNotes={packetNotes}
      canEdit={canEdit}
      lockedReason={lockedReason}
    />
  );
}
