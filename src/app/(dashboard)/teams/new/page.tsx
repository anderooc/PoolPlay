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

import { redirect } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schoolMembers, schools } from "@/lib/db/schema";
import { NewTeamForm } from "./new-team-form";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("New team");

interface Props {
  searchParams?: Promise<{ schoolId?: string }>;
}

export default async function NewTeamPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = (await searchParams) ?? {};

  // Schools where the current user is a president or officer — those are the
  // only schools they can create teams under.
  const manageableSchools = await db
    .select({
      id: schools.id,
      slug: schools.slug,
      name: schools.name,
      gender: schools.gender,
      region: schools.region,
      role: schoolMembers.role,
    })
    .from(schools)
    .innerJoin(schoolMembers, eq(schoolMembers.schoolId, schools.id))
    .where(
      and(
        eq(schoolMembers.userId, user.id),
        ne(schoolMembers.role, "member")
      )
    )
    .orderBy(asc(schools.name));

  const preselectedSchoolId = sp.schoolId ?? null;

  return (
    <NewTeamForm
      schools={manageableSchools.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        gender: s.gender,
        region: s.region,
      }))}
      preselectedSchoolId={preselectedSchoolId}
    />
  );
}
