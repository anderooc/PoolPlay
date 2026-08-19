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

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { schoolMembers } from "@/lib/db/schema";
import { createUserNotifications } from "@/lib/notifications/store";

export async function notifySchoolOfficersOfJoinRequest(input: {
  schoolId: string;
  schoolSlug: string;
  schoolName: string;
  requesterName: string;
  excludeUserId?: string;
}): Promise<void> {
  const officers = await db
    .select({ userId: schoolMembers.userId })
    .from(schoolMembers)
    .where(
      and(
        eq(schoolMembers.schoolId, input.schoolId),
        inArray(schoolMembers.role, ["president", "officer"])
      )
    );

  const uniqueUserIds = [
    ...new Set(
      officers
        .map((row) => row.userId)
        .filter((userId) => userId !== input.excludeUserId)
    ),
  ];

  await createUserNotifications(
    uniqueUserIds.map((userId) => ({
      userId,
      kind: "school_join_request",
      title: input.schoolName,
      body: `${input.requesterName} requested to join the school roster`,
      href: `/schools/${input.schoolSlug}`,
    }))
  );
}

export async function notifyRequesterOfJoinUpdate(input: {
  userId: string;
  schoolSlug: string;
  schoolName: string;
  approved: boolean;
}): Promise<void> {
  await createUserNotifications([
    {
      userId: input.userId,
      kind: "school_join_update",
      title: input.schoolName,
      body: input.approved
        ? "Your request to join the school roster was approved"
        : "Your request to join the school roster was declined",
      href: `/schools/${input.schoolSlug}`,
    },
  ]);
}
