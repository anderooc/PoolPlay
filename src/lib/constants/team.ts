import type { TeamVerificationStatus } from "@/types";

/** Database enum values for `team_gender`. */
export const TEAM_GENDERS = ["mens", "womens"] as const;

/** Database enum values for `team_region`. */
export const TEAM_REGIONS = [
  "north",
  "northeast",
  "east",
  "east_central",
  "central",
  "south",
  "southeast",
  "west",
  "northwest",
] as const;

export const TEAM_GENDER_LABELS: Record<
  (typeof TEAM_GENDERS)[number],
  string
> = {
  mens: "Men's",
  womens: "Women's",
};

export const TEAM_REGION_LABELS: Record<
  (typeof TEAM_REGIONS)[number],
  string
> = {
  north: "North",
  northeast: "Northeast",
  east: "East",
  east_central: "East Central",
  central: "Central/Midwest",
  south: "South",
  southeast: "Southeast",
  west: "West",
  northwest: "Northwest",
};

export const TEAM_VERIFICATION_STATUS_LABELS: Record<
  TeamVerificationStatus,
  string
> = {
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
};
