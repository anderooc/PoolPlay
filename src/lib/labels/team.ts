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

import {
  TEAM_GENDERS,
  TEAM_REGIONS,
  TEAM_GENDER_LABELS,
  TEAM_REGION_LABELS,
} from "@/lib/constants/team";
import type { TeamGender, TeamRegion } from "@/types";

export function formatTeamGender(gender: TeamGender): string {
  return TEAM_GENDER_LABELS[gender];
}

export function formatTeamRegion(region: TeamRegion): string {
  return TEAM_REGION_LABELS[region];
}

export function formatTeamAttributes(
  gender: TeamGender,
  region: TeamRegion
): string {
  return `${formatTeamGender(gender)} · ${formatTeamRegion(region)}`;
}

export function isTeamGender(value: string): value is TeamGender {
  return (TEAM_GENDERS as readonly string[]).includes(value);
}

export function isTeamRegion(value: string): value is TeamRegion {
  return (TEAM_REGIONS as readonly string[]).includes(value);
}
