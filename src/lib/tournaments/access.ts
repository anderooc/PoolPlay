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

import { db } from "@/lib/db";
import { schoolMembers, tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  canViewTournament,
  type TournamentForPermissions,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";

export async function getUserSchoolIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ schoolId: schoolMembers.schoolId })
    .from(schoolMembers)
    .where(eq(schoolMembers.userId, userId));
  return new Set(rows.map((row) => row.schoolId));
}

export function isMemberOfHostSchool(
  hostSchoolId: string | null,
  userSchoolIds: Set<string>
): boolean {
  return Boolean(hostSchoolId && userSchoolIds.has(hostSchoolId));
}

export function filterVisibleTournaments<
  T extends Pick<
    TournamentForPermissions,
    "status" | "organizerId" | "hostSchoolId"
  >,
>(list: T[], user: UserForPermissions, userSchoolIds: Set<string>): T[] {
  return list.filter((tournament) =>
    canViewTournament(
      tournament,
      user,
      isMemberOfHostSchool(tournament.hostSchoolId, userSchoolIds)
    )
  );
}

export async function getTournamentBySlugIfVisible(
  slug: string,
  user: UserForPermissions
) {
  const [tournament, userSchoolIds] = await Promise.all([
    db
      .select()
      .from(tournaments)
      .where(eq(tournaments.slug, slug))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getUserSchoolIds(user.id),
  ]);

  if (!tournament) return null;
  if (
    !canViewTournament(
      tournament,
      user,
      isMemberOfHostSchool(tournament.hostSchoolId, userSchoolIds)
    )
  ) {
    return null;
  }

  return tournament;
}
