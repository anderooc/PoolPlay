/*
 * ShootSet - Collegiate club volleyball tournament hub
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
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schoolMembers, schools } from "@/lib/db/schema";
import { NewSchoolForm } from "./new-school-form";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("New school");

export const dynamic = "force-dynamic";

export default async function NewSchoolPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Users can only belong to one school. If they already have one, send
  // them there instead of the create flow.
  const [mine] = await db
    .select({ slug: schools.slug })
    .from(schoolMembers)
    .innerJoin(schools, eq(schools.id, schoolMembers.schoolId))
    .where(eq(schoolMembers.userId, user.id))
    .limit(1);
  if (mine) redirect(`/schools/${mine.slug}`);

  return <NewSchoolForm />;
}
