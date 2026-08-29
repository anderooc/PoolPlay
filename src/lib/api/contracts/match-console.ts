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

/** Wire-safe copies of match labels — keep this file free of server imports. */
export type MatchConsoleMatchFormat =
  | "play_all_3"
  | "best_of_2"
  | "two_with_tiebreak";

export type MatchConsoleWarmupFormat = "none" | "three_three_one";

export type MatchConsolePhase =
  | "upcoming"
  | "warmup"
  | "paused"
  | "in_progress"
  | "completed";

export interface MatchConsoleSetTrackerEntry {
  setNumber: number;
  target: number;
  teamAScore: number;
  teamBScore: number;
  complete: boolean;
  current: boolean;
}

export interface MatchConsoleScoreState {
  setsWonA: number;
  setsWonB: number;
  requiredSets: number;
  maxSets: number;
  currentSetNumber: number;
  currentTarget: number;
  tracker: MatchConsoleSetTrackerEntry[];
}

export type MatchConsoleRefCrewRole =
  | "up_ref"
  | "down_ref"
  | "line_ref_1"
  | "line_ref_2"
  | "scorekeeper_1"
  | "scorekeeper_2"
  | "scorekeeper_3";

export interface MatchConsoleRefCrewSlot {
  role: MatchConsoleRefCrewRole;
  label: string;
  userId: string | null;
  fullName: string | null;
  claimedAt: string | null;
  required: boolean;
}

export interface MatchConsoleRefCrewState {
  slots: MatchConsoleRefCrewSlot[];
  pointKeeperUserId: string | null;
  pointKeeperFullName: string | null;
  missingRequiredRoles: MatchConsoleRefCrewRole[];
  isCrewComplete: boolean;
  viewerSlot: MatchConsoleRefCrewRole | null;
  viewerIsPointKeeper: boolean;
}

export interface MatchConsoleTeamContract {
  id: string;
  slug: string;
  name: string;
}

export interface MatchConsoleSetContract {
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
}

export interface MatchConsoleContract {
  tournamentSlug: string;
  tournamentName: string;
  matchSlug: string;
  status: "upcoming" | "in_progress" | "completed";
  derivedPhase: MatchConsolePhase;
  scheduledTime: string | null;
  warmupStartedAt: string | null;
  startedAt: string | null;
  courtName: string | null;
  divisionName: string | null;
  refTeamName: string | null;
  phase: "pool" | "bracket";
  isBye: boolean;
  teamA: MatchConsoleTeamContract | null;
  teamB: MatchConsoleTeamContract | null;
  winnerSlug: string | null;
  sets: MatchConsoleSetContract[];
  settings: {
    matchFormat: MatchConsoleMatchFormat;
    setStartingScore: number;
    setTargetScore: number;
    tiebreakTargetScore: number;
    warmupFormat: MatchConsoleWarmupFormat;
  };
  scoreState: MatchConsoleScoreState;
  crew: MatchConsoleRefCrewState;
  permissions: {
    canScore: boolean;
    canRunLifecycle: boolean;
    canClaimCrewSlot: boolean;
    canBecomePointKeeper: boolean;
    isOrganizer: boolean;
    isRefMember: boolean;
    /** @deprecated use canScore || canRunLifecycle */
    canControl: boolean;
  };
}

export interface MatchConsoleMutationResultContract {
  success: true;
  console: MatchConsoleContract;
}
