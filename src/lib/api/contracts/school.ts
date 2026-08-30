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
  SchoolMemberRole,
  SchoolVerificationStatus,
  TeamGender,
  TeamRegion,
} from "@/types";

export interface SchoolListItemContract {
  slug: string;
  name: string;
  university: string;
  gender: TeamGender;
  region: TeamRegion;
  verificationStatus: SchoolVerificationStatus;
  domainHint: string | null;
  teamCount: number;
  matchesViewerEmail: boolean;
}

export interface SchoolListContract {
  schools: SchoolListItemContract[];
  total: number;
  mySchool: { slug: string; name: string } | null;
}

export interface SchoolMemberContract {
  membershipId: string;
  userId: string;
  fullName: string;
  role: SchoolMemberRole;
  title: string | null;
  volleyballPosition: string | null;
  jerseyNumber: number | null;
  isViewer: boolean;
  canRemove: boolean;
  canChangeRole: boolean;
  canEditPosition: boolean;
  canEditJersey: boolean;
  canTransferPresidencyTo: boolean;
}

export interface SchoolTeamContract {
  slug: string;
  name: string;
  gender: TeamGender;
  region: TeamRegion;
  memberCount: number;
}

export interface SchoolJoinRequestContract {
  id: string;
  userId: string;
  fullName: string;
  email: string;
}

export interface SchoolDetailContract {
  slug: string;
  name: string;
  university: string;
  gender: TeamGender;
  region: TeamRegion;
  description: string | null;
  websiteUrl: string | null;
  domainHint: string | null;
  domainMatched: boolean;
  verificationStatus: SchoolVerificationStatus;
  memberCount: number;
  members: SchoolMemberContract[];
  teams: SchoolTeamContract[];
  joinRequests: SchoolJoinRequestContract[];
  viewer: {
    isMember: boolean;
    role: SchoolMemberRole | null;
    hasPendingJoinRequest: boolean;
    canRequestToJoin: boolean;
    alreadyInAnotherSchool: boolean;
    joinBlockedReason: string | null;
    canManageSchool: boolean;
    canManageRoster: boolean;
    canTransferPresidency: boolean;
    canSubmitForVerification: boolean;
    verificationBlockedReason: string | null;
    emailDomainMatches: boolean;
    canLeave: boolean;
  };
}

export interface SchoolUpdateResultContract {
  success: true;
  slug: string;
  name: string;
}

export interface SchoolVerificationSubmitResultContract {
  success: true;
  domainMatched: boolean;
}

export interface SchoolJoinResultContract {
  success: true;
  alreadyPending?: boolean;
}

export interface SchoolMutationResultContract {
  success: true;
}
