import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export type HostingTeamOption = {
  id: string;
  name: string;
  university: string;
  gender: (typeof teams.$inferSelect)["gender"];
  region: (typeof teams.$inferSelect)["region"];
};

/** Teams the user may host a tournament as (captain teams, or all teams for admins). */
export async function getHostingTeamOptions(
  userId: string,
  isAdmin: boolean
): Promise<HostingTeamOption[]> {
  if (isAdmin) {
    return db
      .select({
        id: teams.id,
        name: teams.name,
        university: teams.university,
        gender: teams.gender,
        region: teams.region,
      })
      .from(teams)
      .orderBy(asc(teams.university), asc(teams.name));
  }

  return db
    .select({
      id: teams.id,
      name: teams.name,
      university: teams.university,
      gender: teams.gender,
      region: teams.region,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(eq(teamMembers.userId, userId), eq(teamMembers.role, "captain"))
    )
    .orderBy(asc(teams.name));
}

export async function getHostingTeamForUser(
  teamId: string,
  userId: string,
  isAdmin: boolean
): Promise<HostingTeamOption | null> {
  if (isAdmin) {
    const [team] = await db
      .select({
        id: teams.id,
        name: teams.name,
        university: teams.university,
        gender: teams.gender,
        region: teams.region,
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    return team ?? null;
  }

  const [row] = await db
    .select({
      id: teams.id,
      name: teams.name,
      university: teams.university,
      gender: teams.gender,
      region: teams.region,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teams.id, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, "captain")
      )
    )
    .limit(1);

  return row ?? null;
}
