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

import type {
  RegistrationStatus,
  TeamGender,
  TeamMemberRole,
  TeamRegion,
  TournamentStatus,
} from "@/types";

/** How the viewer relates to a tournament on the dashboard. */
export type DashboardTournamentRelation =
  | "pending"
  | "signed_up"
  | "past"
  | "hosting";

export interface DashboardTeamContract {
  slug: string;
  name: string;
  university: string;
  gender: TeamGender;
  region: TeamRegion;
  role: TeamMemberRole;
  jerseyNumber: number | null;
}

export interface DashboardTournamentContract {
  slug: string;
  name: string;
  date: string;
  location: string;
  status: TournamentStatus;
  relation: DashboardTournamentRelation;
  teamName: string | null;
  divisionName: string | null;
  registrationStatus: RegistrationStatus | null;
}

export interface DashboardContract {
  firstName: string;
  school: { slug: string; name: string } | null;
  stats: {
    teamCount: number;
    upcomingCount: number;
    pendingCount: number;
    pastCount: number;
  };
  teams: DashboardTeamContract[];
  tournaments: DashboardTournamentContract[];
}
