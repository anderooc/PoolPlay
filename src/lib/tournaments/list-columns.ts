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

import { tournaments } from "@/lib/db/schema";

/** Columns needed by tournament browse grids — avoids loading full rows. */
export const tournamentListColumns = {
  id: tournaments.id,
  slug: tournaments.slug,
  name: tournaments.name,
  description: tournaments.description,
  location: tournaments.location,
  date: tournaments.date,
  status: tournaments.status,
  gender: tournaments.gender,
  region: tournaments.region,
  hostSchoolId: tournaments.hostSchoolId,
  organizerId: tournaments.organizerId,
};

export type TournamentListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  location: string;
  date: string;
  status: string;
  gender: (typeof tournaments.$inferSelect)["gender"];
  region: (typeof tournaments.$inferSelect)["region"];
  hostSchoolId: string | null;
  organizerId: string;
};
