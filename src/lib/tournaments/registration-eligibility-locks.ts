import { asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, teams } from "@/lib/db/schema";

type EligibilityLockClient = Pick<typeof db, "select">;

export type LockedRegistrationTeam = {
  id: string;
  gender: (typeof teams.$inferSelect)["gender"];
  schoolId: string | null;
  schoolVerificationStatus:
    | (typeof schools.$inferSelect)["verificationStatus"]
    | null;
  teamVerificationStatus: (typeof teams.$inferSelect)["verificationStatus"];
};

export async function lockRegistrationEligibilityRows(
  client: EligibilityLockClient,
  teamIds: Iterable<string>
): Promise<Map<string, LockedRegistrationTeam>> {
  const sortedTeamIds = [...new Set(teamIds)].sort();
  if (sortedTeamIds.length === 0) return new Map();

  const teamRows = await client
    .select({
      id: teams.id,
      gender: teams.gender,
      schoolId: teams.schoolId,
      teamVerificationStatus: teams.verificationStatus,
    })
    .from(teams)
    .where(inArray(teams.id, sortedTeamIds))
    .orderBy(asc(teams.id))
    .for("share");
  const schoolIds = [...new Set(
    teamRows.flatMap((team) => team.schoolId ? [team.schoolId] : [])
  )].sort();
  const schoolRows = schoolIds.length === 0
    ? []
    : await client
        .select({
          id: schools.id,
          verificationStatus: schools.verificationStatus,
        })
        .from(schools)
        .where(inArray(schools.id, schoolIds))
        .orderBy(asc(schools.id))
        .for("share");
  const schoolStatusById = new Map(
    schoolRows.map((school) => [school.id, school.verificationStatus])
  );
  return new Map(teamRows.map((team) => [team.id, {
    ...team,
    schoolVerificationStatus: team.schoolId
      ? schoolStatusById.get(team.schoolId) ?? null
      : null,
  }]));
}
