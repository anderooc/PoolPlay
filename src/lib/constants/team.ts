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
