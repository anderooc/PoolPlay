import type { InferSelectModel } from "drizzle-orm";
import { tournaments } from "@/lib/db/schema";
import {
  isTournamentOrganizer,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";
import { getDivisionPlayData } from "../brackets/data";
import { MatchBoard } from "../match-board";

export async function TournamentMatchesPanel({
  tournament,
  user,
}: {
  tournament: InferSelectModel<typeof tournaments>;
  user: UserForPermissions;
}) {
  const isOrganizer = isTournamentOrganizer(tournament, user);
  const divisionPlayData = await getDivisionPlayData(tournament.id, {
    forOrganizer: isOrganizer,
  });

  return (
    <div>
      <MatchBoard
        slug={tournament.slug}
        divisions={divisionPlayData}
        settings={{
          format: tournament.matchFormat,
          targetScore: tournament.setTargetScore,
          tiebreakTargetScore: tournament.tiebreakTargetScore,
        }}
      />
    </div>
  );
}
