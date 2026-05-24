import { db } from "@/lib/db";
import { divisions, registrations, teams } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

/** Postgres NOT NULL violation — DB not migrated for nullable division_id yet */
function isNotNullViolation(e: unknown): boolean {
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "23502"
  ) {
    return true;
  }
  if (typeof e === "object" && e !== null && "cause" in e) {
    return isNotNullViolation((e as { cause: unknown }).cause);
  }
  return false;
}

export async function getFirstDivisionId(
  tournamentId: string
): Promise<string | null> {
  const [firstDivision] = await db
    .select({ id: divisions.id })
    .from(divisions)
    .where(eq(divisions.tournamentId, tournamentId))
    .orderBy(asc(divisions.createdAt))
    .limit(1);

  return firstDivision?.id ?? null;
}

export async function insertTeamRegistration(
  tournamentId: string,
  teamId: string,
  status: "confirmed" | "pending",
  firstDivisionId: string | null = null
) {
  const row = {
    teamId,
    tournamentId,
    divisionId: null as string | null,
    status,
  };

  try {
    await db.insert(registrations).values(row);
  } catch (e) {
    if (isNotNullViolation(e) && firstDivisionId) {
      await db.insert(registrations).values({
        ...row,
        divisionId: firstDivisionId,
      });
    } else if (isNotNullViolation(e) && !firstDivisionId) {
      throw new Error(
        "Add at least one division to this tournament before registering teams. (Or run the DB migration so division can be unset until you assign pools.)"
      );
    } else {
      throw e;
    }
  }
}

/** Auto-register all teams under the hosting school as confirmed. */
export async function registerHostSchoolTeamsOnCreate(
  tournamentId: string,
  hostSchoolId: string
) {
  const schoolTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.schoolId, hostSchoolId));

  const firstDivisionId = await getFirstDivisionId(tournamentId);

  for (const team of schoolTeams) {
    await insertTeamRegistration(
      tournamentId,
      team.id,
      "confirmed",
      firstDivisionId
    );
  }
}
