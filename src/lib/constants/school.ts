/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import type {
  SchoolMemberRole,
  SchoolVerificationStatus,
} from "@/types";

export const SCHOOL_MEMBER_ROLES: SchoolMemberRole[] = [
  "president",
  "officer",
  "member",
];

export const SCHOOL_MEMBER_ROLE_LABELS: Record<SchoolMemberRole, string> = {
  president: "President",
  officer: "Officer",
  member: "Member",
};

export const SCHOOL_VERIFICATION_STATUS_LABELS: Record<
  SchoolVerificationStatus,
  string
> = {
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
};

/** Minimum officer count required (in addition to a president) before
 * a school can submit for verification. */
export const SCHOOL_MIN_OFFICERS_FOR_VERIFICATION = 1;
