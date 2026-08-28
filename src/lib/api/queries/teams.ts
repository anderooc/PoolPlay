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

import { and, asc, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  schoolMembers,
  schools,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import { isStandaloneTeam } from "@/lib/teams/verification";
import type {
  TeamDetailContract,
  TeamListContract,
} from "../contracts/team";
import { notFound } from "../errors";

export async function loadTeamListForViewer(
  user: AppUser
): Promise<TeamListContract> {
  const rows = await db
    .select({
      slug: teams.slug,
      name: teams.name,
      university: teams.university,
      gender: teams.gender,
      region: teams.region,
      role: teamMembers.role,
      schoolId: teams.schoolId,
      verificationStatus: teams.verificationStatus,
      schoolName: schools.name,
      schoolSlug: schools.slug,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teamMembers.userId, user.id))
    .orderBy(asc(teams.name));

  return {
    teams: rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      university: row.university,
      gender: row.gender,
      region: row.region,
      role: row.role,
      verificationStatus: row.verificationStatus,
      isStandalone: isStandaloneTeam(row.schoolId),
      school:
        row.schoolSlug && row.schoolName
          ? { slug: row.schoolSlug, name: row.schoolName }
          : null,
    })),
  };
}

export async function loadTeamDetailForViewer(
  slug: string,
  user: AppUser
): Promise<TeamDetailContract> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);
  if (!team) throw notFound("Team not found.");

  const [members, schoolRow, mySchoolMembership, schoolRoster] =
    await Promise.all([
      db
        .select({
          membershipId: teamMembers.id,
          userId: users.id,
          fullName: users.fullName,
          role: teamMembers.role,
          jerseyNumber: teamMembers.jerseyNumber,
          volleyballPosition: users.volleyballPosition,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, team.id))
        .orderBy(asc(teamMembers.role), asc(users.fullName)),
      team.schoolId
        ? db
            .select({
              slug: schools.slug,
              name: schools.name,
              verificationStatus: schools.verificationStatus,
            })
            .from(schools)
            .where(eq(schools.id, team.schoolId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
      team.schoolId
        ? db
            .select({ role: schoolMembers.role })
            .from(schoolMembers)
            .where(
              and(
                eq(schoolMembers.schoolId, team.schoolId),
                eq(schoolMembers.userId, user.id)
              )
            )
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
      team.schoolId
        ? db
            .select({
              userId: users.id,
              fullName: users.fullName,
              email: users.email,
              schoolRole: schoolMembers.role,
              volleyballPosition: users.volleyballPosition,
              jerseyNumber: users.jerseyNumber,
            })
            .from(schoolMembers)
            .innerJoin(users, eq(schoolMembers.userId, users.id))
            .where(eq(schoolMembers.schoolId, team.schoolId))
            .orderBy(asc(users.fullName))
        : Promise.resolve([]),
    ]);

  const membership = members.find((member) => member.userId === user.id);
  const canManage =
    membership?.role === "captain" ||
    isAdmin(user) ||
    mySchoolMembership?.role === "president" ||
    mySchoolMembership?.role === "officer";

  const onTeam = new Set(members.map((member) => member.userId));

  return {
    slug: team.slug,
    name: team.name,
    university: team.university,
    gender: team.gender,
    region: team.region,
    season: team.season,
    verificationStatus: team.verificationStatus,
    isStandalone: isStandaloneTeam(team.schoolId),
    school: schoolRow,
    members: members.map((member) => ({
      membershipId: member.membershipId,
      userId: member.userId,
      fullName: member.fullName,
      role: member.role,
      jerseyNumber: member.jerseyNumber,
      volleyballPosition: member.volleyballPosition,
      isViewer: member.userId === user.id,
      canRemove: canManage && member.role !== "captain",
      canEditJersey: canManage,
      canEditPosition: canManage,
    })),
    rosterCandidates: canManage
      ? schoolRoster
          .filter((row) => !onTeam.has(row.userId))
          .map((row) => ({
            userId: row.userId,
            fullName: row.fullName,
            email: row.email,
            schoolRole: row.schoolRole,
            volleyballPosition: row.volleyballPosition,
            jerseyNumber: row.jerseyNumber,
          }))
      : [],
    viewer: {
      isMember: Boolean(membership),
      role: membership?.role ?? null,
      canManage,
    },
  };
}
