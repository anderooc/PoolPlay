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
import { schoolMembers, schools } from "@/lib/db/schema";
import { and, asc, eq, or } from "drizzle-orm";

export type HostingSchoolOption = {
  id: string;
  name: string;
  university: string;
  gender: (typeof schools.$inferSelect)["gender"];
  region: (typeof schools.$inferSelect)["region"];
};

/** The school this user hosts tournaments as (president/officer membership). */
export async function getUserHostingSchool(
  userId: string
): Promise<HostingSchoolOption | null> {
  const [row] = await db
    .select({
      id: schools.id,
      name: schools.name,
      university: schools.university,
      gender: schools.gender,
      region: schools.region,
    })
    .from(schoolMembers)
    .innerJoin(schools, eq(schoolMembers.schoolId, schools.id))
    .where(
      and(
        eq(schoolMembers.userId, userId),
        or(
          eq(schoolMembers.role, "president"),
          eq(schoolMembers.role, "officer")
        )
      )
    )
    .limit(1);

  return row ?? null;
}

/** Schools the user may host a tournament as (officer-or-above, or all for admins). */
export async function getHostingSchoolOptions(
  userId: string,
  isAdmin: boolean
): Promise<HostingSchoolOption[]> {
  if (isAdmin) {
    return db
      .select({
        id: schools.id,
        name: schools.name,
        university: schools.university,
        gender: schools.gender,
        region: schools.region,
      })
      .from(schools)
      .orderBy(asc(schools.university), asc(schools.name));
  }

  return db
    .select({
      id: schools.id,
      name: schools.name,
      university: schools.university,
      gender: schools.gender,
      region: schools.region,
    })
    .from(schoolMembers)
    .innerJoin(schools, eq(schoolMembers.schoolId, schools.id))
    .where(
      and(
        eq(schoolMembers.userId, userId),
        or(
          eq(schoolMembers.role, "president"),
          eq(schoolMembers.role, "officer")
        )
      )
    )
    .orderBy(asc(schools.name));
}

export async function getHostingSchoolForUser(
  schoolId: string,
  userId: string,
  isAdmin: boolean
): Promise<HostingSchoolOption | null> {
  if (isAdmin) {
    const [school] = await db
      .select({
        id: schools.id,
        name: schools.name,
        university: schools.university,
        gender: schools.gender,
        region: schools.region,
      })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    return school ?? null;
  }

  const [row] = await db
    .select({
      id: schools.id,
      name: schools.name,
      university: schools.university,
      gender: schools.gender,
      region: schools.region,
    })
    .from(schoolMembers)
    .innerJoin(schools, eq(schoolMembers.schoolId, schools.id))
    .where(
      and(
        eq(schools.id, schoolId),
        eq(schoolMembers.userId, userId),
        or(
          eq(schoolMembers.role, "president"),
          eq(schoolMembers.role, "officer")
        )
      )
    )
    .limit(1);

  return row ?? null;
}
