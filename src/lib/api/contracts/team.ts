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
  SchoolVerificationStatus,
  TeamGender,
  TeamMemberRole,
  TeamRegion,
  TeamVerificationStatus,
} from "@/types";

export interface TeamListItemContract {
  slug: string;
  name: string;
  university: string;
  gender: TeamGender;
  region: TeamRegion;
  role: TeamMemberRole;
  verificationStatus: TeamVerificationStatus;
  isStandalone: boolean;
  school: { slug: string; name: string } | null;
}

export interface TeamListContract {
  teams: TeamListItemContract[];
}

export interface TeamMemberContract {
  membershipId: string;
  userId: string;
  fullName: string;
  role: TeamMemberRole;
  jerseyNumber: number | null;
  volleyballPosition: string | null;
  isViewer: boolean;
  canRemove: boolean;
  canEditJersey: boolean;
  canEditPosition: boolean;
}

export interface TeamRosterCandidateContract {
  userId: string;
  fullName: string;
  email: string;
  schoolRole: string | null;
  volleyballPosition: string | null;
  jerseyNumber: number | null;
}

export interface TeamDetailContract {
  slug: string;
  name: string;
  university: string;
  gender: TeamGender;
  region: TeamRegion;
  season: string | null;
  verificationStatus: TeamVerificationStatus;
  isStandalone: boolean;
  school: {
    slug: string;
    name: string;
    verificationStatus: SchoolVerificationStatus;
  } | null;
  members: TeamMemberContract[];
  rosterCandidates: TeamRosterCandidateContract[];
  viewer: {
    isMember: boolean;
    role: TeamMemberRole | null;
    canManage: boolean;
  };
}

export interface TeamMutationResultContract {
  success: true;
}
