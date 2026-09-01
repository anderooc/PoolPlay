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

import "server-only";

import { and, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schoolMembers, teamMembers, teams, users } from "@/lib/db/schema";
import { invalidatePublicTournamentCachesByIds } from "@/lib/tournaments/public-cache-invalidation";
import {
  deleteTeamWithTournamentLocks,
  type TeamDeletionTeam,
} from "@/lib/teams/team-deletion";
import type { TeamMutationResultContract } from "../contracts/team";
import { badRequest, notFound } from "../errors";

async function actorCanDeleteTeam(
  tx: typeof db,
  team: TeamDeletionTeam,
  actorId: string
): Promise<boolean> {
  const [actor] = await tx
    .select({ role: users.role, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.id, actorId))
    .for("share")
    .limit(1);
  if (!actor || actor.disabledAt) return false;
  if (actor.role === "admin") return true;
  const [membership] = await tx
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, actorId)))
    .for("share")
    .limit(1);
  if (membership?.role === "captain") return true;
  if (!team.schoolId) return false;
  const [schoolRole] = await tx
    .select({ role: schoolMembers.role })
    .from(schoolMembers)
    .where(
      and(
        eq(schoolMembers.schoolId, team.schoolId),
        eq(schoolMembers.userId, actorId)
      )
    )
    .for("share")
    .limit(1);
  return schoolRole?.role === "president" || schoolRole?.role === "officer";
}

export async function deleteTeamForViewer(
  slug: string,
  user: AppUser,
  confirmationName: string
): Promise<TeamMutationResultContract> {
  const [team] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);
  if (!team) throw notFound("Team not found.");

  let result: Awaited<ReturnType<typeof deleteTeamWithTournamentLocks>>;
  try {
    result = await deleteTeamWithTournamentLocks({
      teamId: team.id,
      confirmationName,
      authorize: async (tx, row) =>
        (await actorCanDeleteTeam(tx, row, user.id))
          ? null
          : "Only team captains or school officers can delete this team",
      afterCommit: async (parents) => {
        await invalidatePublicTournamentCachesByIds(
          parents.map((parent) => parent.id),
          { listing: true }
        );
      },
    });
  } catch {
    throw badRequest("Could not delete team. Try again.");
  }

  if (!result.ok) {
    throw badRequest(result.error);
  }

  return { success: true };
}
