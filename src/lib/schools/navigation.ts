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
