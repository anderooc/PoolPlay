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

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  schoolMembers,
  schools,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import {
  findJerseyCollision,
  jerseyCollisionError,
  type JerseyOccupant,
} from "@/lib/profile/jersey-number";

type DbClient = typeof db;

export type AssignJerseyResult =
  | { error: string }
  | { ok: true; schoolSlug: string | null; teamSlugs: string[] };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

async function schoolOccupantsForUser(
  client: DbClient,
  userId: string
): Promise<{ schoolSlug: string | null; occupants: JerseyOccupant[] }> {
  const [membership] = await client
    .select({
      schoolId: schoolMembers.schoolId,
      slug: schools.slug,
    })
    .from(schoolMembers)
    .innerJoin(schools, eq(schoolMembers.schoolId, schools.id))
    .where(eq(schoolMembers.userId, userId))
    .limit(1);

  if (!membership) {
    return { schoolSlug: null, occupants: [] };
  }

  const occupants = await client
    .select({
      userId: schoolMembers.userId,
      jerseyNumber: users.jerseyNumber,
    })
    .from(schoolMembers)
    .innerJoin(users, eq(schoolMembers.userId, users.id))
    .where(eq(schoolMembers.schoolId, membership.schoolId));

  return { schoolSlug: membership.slug, occupants };
}

async function teamOccupantsForUser(
  client: DbClient,
  userId: string,
  extraTeamId?: string
): Promise<{ teamSlugs: string[]; occupants: JerseyOccupant[] }> {
  const myTeams = await client
    .select({
      teamId: teamMembers.teamId,
      slug: teams.slug,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));

  const teamIds = new Set(myTeams.map((row) => row.teamId));
  if (extraTeamId) teamIds.add(extraTeamId);

  const extraSlug =
    extraTeamId && !myTeams.some((row) => row.teamId === extraTeamId)
      ? await client
          .select({ slug: teams.slug })
          .from(teams)
          .where(eq(teams.id, extraTeamId))
          .limit(1)
          .then((rows) => rows[0]?.slug ?? null)
      : null;

  const teamSlugs = [
    ...myTeams.map((row) => row.slug),
    ...(extraSlug ? [extraSlug] : []),
  ];

  if (teamIds.size === 0) {
    return { teamSlugs, occupants: [] };
  }

  const occupants = await client
    .select({
      userId: teamMembers.userId,
      jerseyNumber: teamMembers.jerseyNumber,
    })
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, [...teamIds]));

  return { teamSlugs, occupants };
}

export async function assignUserJerseyNumber(
  client: DbClient,
  params: {
    userId: string;
    jerseyNumber: number | null;
    extraTeamId?: string;
  }
): Promise<AssignJerseyResult> {
  const { schoolSlug, occupants: schoolOccupants } =
    await schoolOccupantsForUser(client, params.userId);
  const { teamSlugs, occupants: teamOccupants } = await teamOccupantsForUser(
    client,
    params.userId,
    params.extraTeamId
  );

  const collision = findJerseyCollision({
    userId: params.userId,
    jerseyNumber: params.jerseyNumber,
    schoolOccupants,
    teamOccupants,
  });
  if (collision && params.jerseyNumber !== null) {
    return {
      error: jerseyCollisionError(collision, params.jerseyNumber),
    };
  }

  try {
    await client.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          jerseyNumber: params.jerseyNumber,
          updatedAt: new Date(),
        })
        .where(eq(users.id, params.userId));
      await tx
        .update(teamMembers)
        .set({ jerseyNumber: params.jerseyNumber })
        .where(eq(teamMembers.userId, params.userId));
    });
  } catch (error) {
    if (isUniqueViolation(error) && params.jerseyNumber !== null) {
      return {
        error: jerseyCollisionError("team", params.jerseyNumber),
      };
    }
    throw error;
  }

  return { ok: true, schoolSlug, teamSlugs };
}

export async function jerseyTakenOnTeam(
  client: DbClient,
  teamId: string,
  jerseyNumber: number,
  excludeUserId: string
): Promise<boolean> {
  const [taken] = await client
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        ne(teamMembers.userId, excludeUserId),
        eq(teamMembers.jerseyNumber, jerseyNumber)
      )
    )
    .limit(1);
  return Boolean(taken);
}

/** If this user would duplicate a school jersey, clear their number. */
export async function releaseJerseyIfSchoolConflict(
  client: DbClient,
  schoolId: string,
  userId: string
): Promise<void> {
  const [profile] = await client
    .select({ jerseyNumber: users.jerseyNumber })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (profile?.jerseyNumber == null) return;

  const [taken] = await client
    .select({ userId: schoolMembers.userId })
    .from(schoolMembers)
    .innerJoin(users, eq(schoolMembers.userId, users.id))
    .where(
      and(
        eq(schoolMembers.schoolId, schoolId),
        ne(schoolMembers.userId, userId),
        eq(users.jerseyNumber, profile.jerseyNumber)
      )
    )
    .limit(1);
  if (!taken) return;

  await assignUserJerseyNumber(client, { userId, jerseyNumber: null });
}

export function revalidateJerseyPaths(
  result: Extract<AssignJerseyResult, { ok: true }>
) {
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/teams");
  if (result.schoolSlug) revalidatePath(`/schools/${result.schoolSlug}`);
  for (const slug of result.teamSlugs) {
    revalidatePath(`/teams/${slug}`);
  }
}
