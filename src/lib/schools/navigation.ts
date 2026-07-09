import { cache } from "react";
import { db } from "@/lib/db";
import { schoolMembers, schools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type UserSchoolSummary = {
  slug: string;
  name: string;
};

/** The school a user belongs to, if any (one school per user). */
export const getUserSchoolSummary = cache(async function getUserSchoolSummary(
  userId: string
): Promise<UserSchoolSummary | null> {
  const [row] = await db
    .select({ slug: schools.slug, name: schools.name })
    .from(schoolMembers)
    .innerJoin(schools, eq(schools.id, schoolMembers.schoolId))
    .where(eq(schoolMembers.userId, userId))
    .limit(1);

  return row ?? null;
});
