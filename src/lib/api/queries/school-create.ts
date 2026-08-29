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

import { eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { flagBlockedContent } from "@/lib/admin/content-flags";
import { db } from "@/lib/db";
import { schoolMembers, schools } from "@/lib/db/schema";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import { createSchoolSchema, type CreateSchoolInput } from "@/lib/validators";
import type { CreateEntityResultContract } from "../contracts/create";
import { badRequest } from "../errors";

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

export async function createSchoolForViewer(
  user: AppUser,
  input: CreateSchoolInput
): Promise<CreateEntityResultContract> {
  const existingSlug = await findExistingSchoolSlugForUser(user.id);
  if (existingSlug) {
    throw badRequest(
      "You're already part of a school. Leave it before creating a new one."
    );
  }

  const parsed = createSchoolSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0].message);
  }

  const contentError = await flagBlockedContent(user.id, [
    { area: "school.name", text: parsed.data.name },
    { area: "school.university", text: parsed.data.university },
    { area: "school.description", text: parsed.data.description ?? null },
  ]);
  if (contentError) throw badRequest(contentError);

  const base = slugify(
    `${parsed.data.name} ${parsed.data.university}`,
    "school"
  );
  const existingSlugs = await db.select({ slug: schools.slug }).from(schools);
  const slug = uniqueSlug(
    base,
    existingSlugs.map((s) => s.slug)
  );

  const result = await db.transaction(async (tx) => {
    const [school] = await tx
      .insert(schools)
      .values({
        name: parsed.data.name,
        slug,
        university: parsed.data.university,
        gender: parsed.data.gender,
        region: parsed.data.region,
        description: parsed.data.description ?? null,
        websiteUrl: parsed.data.websiteUrl,
        domainHint: parsed.data.domainHint,
      })
      .returning();

    await tx.insert(schoolMembers).values({
      schoolId: school.id,
      userId: user.id,
      role: "president",
    });

    return school;
  });

  return { success: true, slug: result.slug, name: result.name };
}
