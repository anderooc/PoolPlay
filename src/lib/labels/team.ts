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
