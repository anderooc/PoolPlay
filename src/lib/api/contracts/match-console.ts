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

import type { MatchFormat } from "@/lib/labels/match-format";
import type { WarmupFormat } from "@/lib/labels/warmup-format";
import type { MatchRefCrewState } from "@/lib/tournaments/match-ref-crew";
import type { MatchPhase, MatchScoreState } from "@/lib/tournaments/match-format";

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
  derivedPhase: MatchPhase;
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
    matchFormat: MatchFormat;
    setStartingScore: number;
    setTargetScore: number;
    tiebreakTargetScore: number;
    warmupFormat: WarmupFormat;
  };
  scoreState: MatchScoreState;
  crew: MatchRefCrewState;
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
