/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

function isUniqueViolation(e: unknown): boolean {
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "23505"
  ) {
    return true;
  }
  if (typeof e === "object" && e !== null && "cause" in e) {
    return isUniqueViolation((e as { cause: unknown }).cause);
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
): Promise<string> {
  const row = {
    teamId,
    tournamentId,
    divisionId: null as string | null,
    status,
  };

  try {
    const [inserted] = await db
      .insert(registrations)
      .values(row)
      .returning({ id: registrations.id });
    return inserted!.id;
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new Error("This team is already registered for this tournament");
    }
    if (isNotNullViolation(e) && firstDivisionId) {
      const [inserted] = await db
        .insert(registrations)
        .values({
          ...row,
          divisionId: firstDivisionId,
        })
        .returning({ id: registrations.id });
      return inserted!.id;
    }
    if (isNotNullViolation(e) && !firstDivisionId) {
      throw new Error(
        "Add at least one pool to this tournament before registering teams. (Or run the DB migration so pool assignment can be unset until you assign teams.)"
      );
    }
    throw e;
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
