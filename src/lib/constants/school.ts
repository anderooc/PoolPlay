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
