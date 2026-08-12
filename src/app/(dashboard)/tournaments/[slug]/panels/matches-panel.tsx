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

import type { InferSelectModel } from "drizzle-orm";
import { tournaments } from "@/lib/db/schema";
import {
  resolveIsTournamentOrganizer,
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
  const isOrganizer = await resolveIsTournamentOrganizer(tournament, user);
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
