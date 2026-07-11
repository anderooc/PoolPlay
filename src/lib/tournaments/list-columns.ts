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
