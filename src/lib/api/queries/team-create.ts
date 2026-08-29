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

import { and, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import { flagBlockedContent } from "@/lib/admin/content-flags";
import { db } from "@/lib/db";
import {
  schoolMembers,
  schools,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import { createTeamSchema, type CreateTeamInput } from "@/lib/validators";
import type { CreateEntityResultContract } from "../contracts/create";
import { badRequest } from "../errors";

async function getSchoolRole(
  schoolId: string,
  userId: string
): Promise<string | null> {
  const [row] = await db
    .select({ role: schoolMembers.role })
    .from(schoolMembers)
    .where(
      and(
        eq(schoolMembers.schoolId, schoolId),
        eq(schoolMembers.userId, userId)
      )
    )
    .limit(1);
  return row?.role ?? null;
}

export async function createTeamForViewer(
  user: AppUser,
  input: CreateTeamInput
): Promise<CreateEntityResultContract> {
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0].message);
  }

  let teamGender = parsed.data.gender;
  let teamRegion = parsed.data.region;
  let teamUniversity: string | null = null;

  if (parsed.data.schoolId) {
    const role = await getSchoolRole(parsed.data.schoolId, user.id);
    const allowed =
      isAdmin(user) || role === "president" || role === "officer";
    if (!allowed) {
      throw badRequest(
        "Only school presidents or officers can create teams under a school."
      );
    }

    const [parentSchool] = await db
      .select({
        gender: schools.gender,
        region: schools.region,
        university: schools.university,
      })
      .from(schools)
      .where(eq(schools.id, parsed.data.schoolId))
      .limit(1);
    if (!parentSchool) {
      throw badRequest("Selected school no longer exists.");
    }
    teamGender = parentSchool.gender;
    teamRegion = parentSchool.region;
    teamUniversity = parentSchool.university;
  } else {
    const [profile] = await db
      .select({ university: users.university })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    teamUniversity = profile?.university?.trim() ?? "";
    if (!teamUniversity) {
      throw badRequest(
        "Link this team to a school, or add your university when you sign up."
      );
    }
  }

  const teamContentError = await flagBlockedContent(user.id, [
    { area: "team.name", text: parsed.data.name },
    { area: "team.university", text: teamUniversity },
  ]);
  if (teamContentError) throw badRequest(teamContentError);

  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        eq(teams.name, parsed.data.name),
        eq(teams.university, teamUniversity),
        eq(teams.gender, teamGender)
      )
    )
    .limit(1);

  if (existing) {
    throw badRequest(
      "A team with this name, university, and gender already exists"
    );
  }

  const base = slugify(`${parsed.data.name} ${teamUniversity}`, "team");
  const existingSlugs = await db.select({ slug: teams.slug }).from(teams);
  const slug = uniqueSlug(
    base,
    existingSlugs.map((t) => t.slug)
  );

  const [team] = await db
    .insert(teams)
    .values({
      name: parsed.data.name,
      slug,
      university: teamUniversity,
      gender: teamGender,
      region: teamRegion,
      schoolId: parsed.data.schoolId ?? null,
      verificationStatus: parsed.data.schoolId ? "verified" : "pending",
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: "captain",
    jerseyNumber: user.jerseyNumber,
  });

  if (user.role === "player") {
    await db
      .update(users)
      .set({ role: "captain" })
      .where(eq(users.id, user.id));
  }

  return { success: true, slug: team.slug, name: team.name };
}
