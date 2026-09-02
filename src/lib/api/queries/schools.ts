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

import { and, asc, count, desc, eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  schoolJoinRequests,
  schoolMembers,
  schools,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import { notifySchoolOfficersOfJoinRequest } from "@/lib/notifications/school-events";
import { getUserSchoolSummary } from "@/lib/schools/navigation";
import {
  canManageSchool,
  canManageSchoolRoster,
  canSubmitForVerification,
  canTransferPresidency,
  emailMatchesSchoolDomain,
  getVerificationEligibility,
} from "@/lib/schools/permissions";
import {
  hasSchoolSearchCriteria,
  searchSchools,
  type SchoolSearchInput,
} from "@/lib/schools/search";
import type {
  SchoolDetailContract,
  SchoolJoinResultContract,
  SchoolListContract,
} from "../contracts/school";
import { badRequest, notFound } from "../errors";

export async function loadSchoolListForViewer(
  user: AppUser,
  input: SchoolSearchInput
): Promise<SchoolListContract> {
  const mySchool = await getUserSchoolSummary(user.id);

  if (!hasSchoolSearchCriteria(input)) {
    return {
      schools: [],
      total: 0,
      mySchool,
    };
  }

  const page = await searchSchools(input);

  return {
    schools: page.schools.map((school) => ({
      slug: school.slug,
      name: school.name,
      university: school.university,
      gender: school.gender,
      region: school.region,
      verificationStatus: school.verificationStatus,
      domainHint: school.domainHint,
      teamCount: school.teamCount,
      matchesViewerEmail: emailMatchesSchoolDomain(
        user.email,
        school.domainHint
      ),
    })),
    total: page.total,
    mySchool,
  };
}

export async function loadSchoolDetailForViewer(
  slug: string,
  user: AppUser
): Promise<SchoolDetailContract> {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.slug, slug))
    .limit(1);
  if (!school) throw notFound("School not found.");

  const [
    memberRows,
    teamRows,
    [{ value: memberCount }],
    pendingJoinRows,
    userSchoolMembership,
  ] = await Promise.all([
    db
      .select({
        membershipId: schoolMembers.id,
        userId: users.id,
        fullName: users.fullName,
        volleyballPosition: users.volleyballPosition,
        role: schoolMembers.role,
        title: schoolMembers.title,
        jerseyNumber: users.jerseyNumber,
      })
      .from(schoolMembers)
      .innerJoin(users, eq(schoolMembers.userId, users.id))
      .where(eq(schoolMembers.schoolId, school.id))
      .orderBy(asc(users.fullName)),
    db
      .select({
        slug: teams.slug,
        name: teams.name,
        gender: teams.gender,
        region: teams.region,
        memberCount: count(teamMembers.id),
      })
      .from(teams)
      .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
      .where(eq(teams.schoolId, school.id))
      .groupBy(teams.id)
      .orderBy(asc(teams.name)),
    db
      .select({ value: count() })
      .from(schoolMembers)
      .where(eq(schoolMembers.schoolId, school.id)),
    db
      .select({
        id: schoolJoinRequests.id,
        userId: schoolJoinRequests.userId,
        fullName: users.fullName,
        email: users.email,
      })
      .from(schoolJoinRequests)
      .innerJoin(users, eq(schoolJoinRequests.userId, users.id))
      .where(
        and(
          eq(schoolJoinRequests.schoolId, school.id),
          eq(schoolJoinRequests.status, "pending")
        )
      )
      .orderBy(desc(schoolJoinRequests.createdAt)),
    db
      .select({ schoolId: schoolMembers.schoolId })
      .from(schoolMembers)
      .where(eq(schoolMembers.userId, user.id))
      .limit(1),
  ]);

  const myMembership = memberRows.find((row) => row.userId === user.id) ?? null;
  const isMember = myMembership != null;
  const actorMembership = myMembership
    ? {
        schoolId: school.id,
        userId: user.id,
        role: myMembership.role,
      }
    : null;
  const canManageRoster = canManageSchoolRoster(actorMembership, user);
  const canManage = canManageSchool(actorMembership, user);
  const canTransfer = canTransferPresidency(actorMembership, user);
  const officerCount = memberRows.filter((row) => row.role === "officer").length;
  const hasPresident = memberRows.some((row) => row.role === "president");
  const verificationEligibility = getVerificationEligibility({
    status: school.verificationStatus,
    hasPresident,
    officerCount,
  });
  const canSubmitVerification = canSubmitForVerification(
    actorMembership,
    user,
    verificationEligibility
  );
  const hasPendingJoinRequest = pendingJoinRows.some(
    (row) => row.userId === user.id
  );
  const alreadyInAnotherSchool =
    userSchoolMembership.length > 0 &&
    userSchoolMembership[0]!.schoolId !== school.id;
  const alreadyInThisSchool = isMember;
  const domainMatches = emailMatchesSchoolDomain(
    user.email,
    school.domainHint
  );

  let joinBlockedReason: string | null = null;
  let canRequestToJoin = false;
  if (alreadyInThisSchool) {
    joinBlockedReason = null;
  } else if (alreadyInAnotherSchool) {
    joinBlockedReason =
      "You're already part of a school. Leave it before joining another.";
  } else if (!school.domainHint) {
    joinBlockedReason =
      "This school has no email domain on file. Ask a president or officer to add you.";
  } else if (!domainMatches) {
    joinBlockedReason = `Your signup email must match @${school.domainHint} to request to join.`;
  } else if (hasPendingJoinRequest) {
    joinBlockedReason = null;
  } else {
    canRequestToJoin = true;
  }

  return {
    slug: school.slug,
    name: school.name,
    university: school.university,
    gender: school.gender,
    region: school.region,
    description: school.description,
    websiteUrl: school.websiteUrl,
    domainHint: school.domainHint,
    domainMatched: school.domainMatched,
    verificationStatus: school.verificationStatus,
    memberCount: memberCount ?? 0,
    members: memberRows.map((row) => {
      const isViewer = row.userId === user.id;
      const isPresident = row.role === "president";
      return {
        membershipId: row.membershipId,
        userId: row.userId,
        fullName: row.fullName,
        role: row.role,
        title: row.title,
        volleyballPosition: row.volleyballPosition,
        jerseyNumber: row.jerseyNumber,
        isViewer,
        canRemove: canManageRoster && !isPresident,
        canChangeRole: canManageRoster && !isPresident,
        canEditPosition: canManageRoster,
        canEditJersey: canManageRoster,
        canTransferPresidencyTo:
          canTransfer && !isPresident && row.userId !== user.id,
      };
    }),
    teams: teamRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      gender: row.gender,
      region: row.region,
      memberCount: Number(row.memberCount),
    })),
    joinRequests: canManageRoster
      ? pendingJoinRows.map((row) => ({
          id: row.id,
          userId: row.userId,
          fullName: row.fullName,
          email: row.email,
        }))
      : [],
    viewer: {
      isMember,
      role: myMembership?.role ?? null,
      hasPendingJoinRequest,
      canRequestToJoin,
      alreadyInAnotherSchool,
      joinBlockedReason,
      canManageSchool: canManage,
      canManageRoster,
      canTransferPresidency: canTransfer,
      canSubmitForVerification: canSubmitVerification,
      verificationBlockedReason: verificationEligibility.reason,
      emailDomainMatches: domainMatches,
      canLeave: isMember && myMembership?.role !== "president",
    },
  };
}

export async function requestSchoolJoinForViewer(
  slug: string,
  user: AppUser
): Promise<SchoolJoinResultContract> {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.slug, slug))
    .limit(1);
  if (!school) throw notFound("School not found.");

  if (!school.domainHint) {
    throw badRequest(
      "This school has no email domain on file. Ask a president or officer to add you by email."
    );
  }
  if (!emailMatchesSchoolDomain(user.email, school.domainHint)) {
    throw badRequest(
      `Your signup email must match @${school.domainHint} (or a subdomain) to request to join.`
    );
  }

  const [membership] = await db
    .select({ id: schoolMembers.id })
    .from(schoolMembers)
    .where(
      and(
        eq(schoolMembers.schoolId, school.id),
        eq(schoolMembers.userId, user.id)
      )
    )
    .limit(1);
  if (membership) {
    throw badRequest("You are already on this school's roster.");
  }

  const existing = await getUserSchoolSummary(user.id);
  if (existing) {
    throw badRequest(
      "You're already part of a school. Leave it before joining another."
    );
  }

  const [pending] = await db
    .select({
      id: schoolJoinRequests.id,
      schoolId: schoolJoinRequests.schoolId,
    })
    .from(schoolJoinRequests)
    .where(
      and(
        eq(schoolJoinRequests.userId, user.id),
        eq(schoolJoinRequests.status, "pending")
      )
    )
    .limit(1);

  if (pending) {
    if (pending.schoolId === school.id) {
      return { success: true, alreadyPending: true };
    }
    const [other] = await db
      .select({ name: schools.name })
      .from(schools)
      .where(eq(schools.id, pending.schoolId))
      .limit(1);
    throw badRequest(
      `You already have a pending request to join ${other?.name ?? "another school"}. Cancel it first.`
    );
  }

  try {
    await db.insert(schoolJoinRequests).values({
      schoolId: school.id,
      userId: user.id,
    });
  } catch {
    throw badRequest("Could not send join request. Try again.");
  }

  try {
    await notifySchoolOfficersOfJoinRequest({
      schoolId: school.id,
      schoolSlug: school.slug,
      schoolName: school.name,
      requesterName: user.fullName,
      excludeUserId: user.id,
    });
  } catch {
    // Request is saved; notification is best-effort.
  }

  return { success: true };
}

export async function cancelSchoolJoinForViewer(
  slug: string,
  user: AppUser
): Promise<{ success: true }> {
  const [school] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.slug, slug))
    .limit(1);
  if (!school) throw notFound("School not found.");

  const [pending] = await db
    .select({ id: schoolJoinRequests.id })
    .from(schoolJoinRequests)
    .where(
      and(
        eq(schoolJoinRequests.schoolId, school.id),
        eq(schoolJoinRequests.userId, user.id),
        eq(schoolJoinRequests.status, "pending")
      )
    )
    .limit(1);

  if (!pending) {
    throw badRequest("No pending request to cancel.");
  }

  await db
    .update(schoolJoinRequests)
    .set({
      status: "cancelled",
      resolvedAt: new Date(),
      resolvedByUserId: user.id,
    })
    .where(eq(schoolJoinRequests.id, pending.id));

  return { success: true };
}
