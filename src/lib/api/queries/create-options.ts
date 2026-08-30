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

import { and, asc, eq, ne } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schoolMembers, schools } from "@/lib/db/schema";
import { getUserHostingSchool } from "@/lib/schools/hosting";
import type { CreateOptionsContract } from "../contracts/create-options";

async function findExistingSchoolSlugForUser(
  userId: string
): Promise<string | null> {
  const [row] = await db
    .select({ slug: schools.slug })
    .from(schoolMembers)
    .innerJoin(schools, eq(schools.id, schoolMembers.schoolId))
    .where(eq(schoolMembers.userId, userId))
    .limit(1);
  return row?.slug ?? null;
}

export async function loadCreateOptionsForViewer(
  user: AppUser
): Promise<CreateOptionsContract> {
  const [existingSchoolSlug, hostingSchool, manageableSchools] =
    await Promise.all([
      findExistingSchoolSlugForUser(user.id),
      getUserHostingSchool(user.id),
      db
        .select({
          id: schools.id,
          slug: schools.slug,
          name: schools.name,
          gender: schools.gender,
          region: schools.region,
        })
        .from(schools)
        .innerJoin(schoolMembers, eq(schoolMembers.schoolId, schools.id))
        .where(
          and(
            eq(schoolMembers.userId, user.id),
            ne(schoolMembers.role, "member")
          )
        )
        .orderBy(asc(schools.name)),
    ]);

  return {
    canCreateSchool: existingSchoolSlug == null,
    hostingSchool,
    manageableSchools,
  };
}
