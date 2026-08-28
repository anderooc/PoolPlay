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

import { asc, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers, teams } from "@/lib/db/schema";
import { getUserSchoolSummary } from "@/lib/schools/navigation";
import { getDashboardTournaments } from "@/lib/tournaments/dashboard";
import type { DashboardContract } from "../contracts/dashboard";

export async function loadDashboardForViewer(
  user: AppUser
): Promise<DashboardContract> {
  const [userTeams, allMyTournaments, school] = await Promise.all([
    db
      .select({
        slug: teams.slug,
        name: teams.name,
        university: teams.university,
        gender: teams.gender,
        region: teams.region,
        role: teamMembers.role,
        jerseyNumber: teamMembers.jerseyNumber,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, user.id))
      .orderBy(asc(teams.name)),
    getDashboardTournaments(user.id),
    getUserSchoolSummary(user.id),
  ]);

  const upcomingCount = allMyTournaments.filter(
    (tournament) => tournament.relation !== "past"
  ).length;
  const pendingCount = allMyTournaments.filter(
    (tournament) => tournament.relation === "pending"
  ).length;
  const pastCount = allMyTournaments.filter(
    (tournament) => tournament.relation === "past"
  ).length;

  return {
    firstName: user.fullName.split(" ")[0] ?? user.fullName,
    school,
    stats: {
      teamCount: userTeams.length,
      upcomingCount,
      pendingCount,
      pastCount,
    },
    teams: userTeams,
    tournaments: allMyTournaments.slice(0, 12).map((tournament) => ({
      slug: tournament.slug,
      name: tournament.name,
      date: tournament.date,
      location: tournament.location,
      status: tournament.status,
      relation: tournament.relation,
      teamName: tournament.teamName,
      divisionName: tournament.divisionName,
      registrationStatus: tournament.registrationStatus,
    })),
  };
}
