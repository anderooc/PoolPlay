import { db } from "@/lib/db";
import { schools } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { SchoolVerificationStatus } from "@/types";

export type TournamentHostSchool = {
  name: string;
  slug: string;
  verificationStatus: SchoolVerificationStatus;
};

export async function getHostSchoolById(
  hostSchoolId: string | null
): Promise<TournamentHostSchool | null> {
  if (!hostSchoolId) return null;

  const [row] = await db
    .select({
      name: schools.name,
      slug: schools.slug,
      verificationStatus: schools.verificationStatus,
    })
    .from(schools)
    .where(eq(schools.id, hostSchoolId))
    .limit(1);

  return row ?? null;
}

export async function getHostSchoolsByIds(
  hostSchoolIds: (string | null | undefined)[]
): Promise<Map<string, TournamentHostSchool>> {
  const ids = [...new Set(hostSchoolIds.filter(Boolean))] as string[];
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      slug: schools.slug,
      verificationStatus: schools.verificationStatus,
    })
    .from(schools)
    .where(inArray(schools.id, ids));

  return new Map(
    rows.map((row) => [
      row.id,
      {
        name: row.name,
        slug: row.slug,
        verificationStatus: row.verificationStatus,
      },
    ])
  );
}

export async function enrichTournamentsWithHostSchools<
  T extends { hostSchoolId: string | null },
>(list: T[]): Promise<(T & { hostSchool: TournamentHostSchool | null })[]> {
  const bySchoolId = await getHostSchoolsByIds(
    list.map((tournament) => tournament.hostSchoolId)
  );

  return list.map((tournament) => ({
    ...tournament,
    hostSchool: tournament.hostSchoolId
      ? (bySchoolId.get(tournament.hostSchoolId) ?? null)
      : null,
  }));
}
