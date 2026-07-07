import { TournamentPacketPanel } from "../packet-panel";

export function TournamentPacketTabPanel({
  tournamentId,
  slug,
  packetNotes,
  canEdit,
}: {
  tournamentId: string;
  slug: string;
  packetNotes: string | null;
  canEdit: boolean;
}) {
  return (
    <TournamentPacketPanel
      tournamentId={tournamentId}
      slug={slug}
      initialPacketNotes={packetNotes}
      canEdit={canEdit}
    />
  );
}
