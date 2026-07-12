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

import { isAdmin } from "@/lib/auth";
import { SCHOOL_MIN_OFFICERS_FOR_VERIFICATION } from "@/lib/constants/school";
import type {
  SchoolMemberRole,
  SchoolVerificationStatus,
} from "@/types";

export type UserForPermissions = {
  id: string;
  role: string;
};

export type SchoolForPermissions = {
  id: string;
  verificationStatus: SchoolVerificationStatus;
};

export type SchoolMembershipForPermissions = {
  schoolId: string;
  userId: string;
  role: SchoolMemberRole;
};

/**
 * Membership lookup contract. Pages and actions resolve the current user's
 * (school-scoped) membership ahead of time and pass it in.
 */
export type CurrentSchoolMembership = SchoolMembershipForPermissions | null;

export function isSchoolPresident(
  membership: CurrentSchoolMembership
): boolean {
  return membership?.role === "president";
}

export function isSchoolOfficerOrAbove(
  membership: CurrentSchoolMembership
): boolean {
  return (
    membership?.role === "president" || membership?.role === "officer"
  );
}

export function isSchoolMember(
  membership: CurrentSchoolMembership
): boolean {
  return membership !== null;
}

/** Edit details / delete the school. */
export function canManageSchool(
  membership: CurrentSchoolMembership,
  user: UserForPermissions
): boolean {
  if (isAdmin(user)) return true;
  return isSchoolPresident(membership);
}

/** Add/remove school members, edit titles, promote to officer. */
export function canManageSchoolRoster(
  membership: CurrentSchoolMembership,
  user: UserForPermissions
): boolean {
  if (isAdmin(user)) return true;
  return isSchoolOfficerOrAbove(membership);
}

/** Only the current president (or admin) can transfer presidency. */
export function canTransferPresidency(
  membership: CurrentSchoolMembership,
  user: UserForPermissions
): boolean {
  if (isAdmin(user)) return true;
  return isSchoolPresident(membership);
}

/** Officer-or-above can create teams under the school. */
export function canCreateTeamForSchool(
  membership: CurrentSchoolMembership,
  user: UserForPermissions
): boolean {
  if (isAdmin(user)) return true;
  return isSchoolOfficerOrAbove(membership);
}

export type VerificationEligibility = {
  eligible: boolean;
  reason: string | null;
};

/**
 * Verification submission requires: school still pending review, a sitting
 * president, and at least the configured number of officers.
 */
export function getVerificationEligibility(input: {
  status: SchoolVerificationStatus;
  hasPresident: boolean;
  officerCount: number;
}): VerificationEligibility {
  if (input.status === "verified") {
    return { eligible: false, reason: "School is already verified." };
  }
  if (input.status === "rejected") {
    return {
      eligible: false,
      reason:
        "Verification was rejected. Contact an admin to re-open this school for review.",
    };
  }
  if (!input.hasPresident) {
    return {
      eligible: false,
      reason: "Assign a president before submitting for verification.",
    };
  }
  if (input.officerCount < SCHOOL_MIN_OFFICERS_FOR_VERIFICATION) {
    const missing =
      SCHOOL_MIN_OFFICERS_FOR_VERIFICATION - input.officerCount;
    return {
      eligible: false,
      reason: `Add ${missing} more officer${missing === 1 ? "" : "s"} before submitting for verification.`,
    };
  }
  return { eligible: true, reason: null };
}

export function canSubmitForVerification(
  membership: CurrentSchoolMembership,
  user: UserForPermissions,
  eligibility: VerificationEligibility
): boolean {
  if (!eligibility.eligible) return false;
  if (isAdmin(user)) return true;
  return isSchoolPresident(membership);
}

export function canApproveSchool(user: UserForPermissions): boolean {
  return isAdmin(user);
}

/** Returns the email's lowercased domain, or null if invalid. */
export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  return trimmed.slice(at + 1);
}

/** Case-insensitive match between an email's domain and a stored domain hint. */
export function emailMatchesDomain(
  email: string | null | undefined,
  domainHint: string | null | undefined
): boolean {
  const dom = emailDomain(email);
  if (!dom || !domainHint) return false;
  return dom === domainHint.trim().toLowerCase();
}
