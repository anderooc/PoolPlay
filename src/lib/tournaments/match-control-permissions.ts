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
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { UserForPermissions } from "@/lib/tournaments/permissions";
import {
  resolveIsTournamentOrganizer,
  type TournamentForPermissions,
} from "@/lib/tournaments/permissions";
import { isTournamentArchived } from "@/lib/tournament-status";

export function isRefTeamMember(
  match: { refTeamId: string | null },
  userTeamIds: Iterable<string>
): boolean {
  if (!match.refTeamId) return false;
  const ids = userTeamIds instanceof Set ? userTeamIds : new Set(userTeamIds);
  return ids.has(match.refTeamId);
}

/** Host/TD override for scoring without claiming a crew slot. */
export async function canHostOverrideMatchScoring(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): Promise<boolean> {
  if (isTournamentArchived(tournament.date)) return false;
  return resolveIsTournamentOrganizer(tournament, user);
}

/** Host/TD override for lifecycle controls when no point keeper is assigned yet. */
export async function canHostOverrideMatchLifecycle(
  tournament: TournamentForPermissions,
  user: UserForPermissions
): Promise<boolean> {
  return canHostOverrideMatchScoring(tournament, user);
}

/** Edit live scores: designated point keeper, or host override. */
export async function canEditMatchScores(
  tournament: TournamentForPermissions,
  user: UserForPermissions,
  match: { pointKeeperUserId: string | null }
): Promise<boolean> {
  if (isTournamentArchived(tournament.date)) return false;
  if (await canHostOverrideMatchScoring(tournament, user)) return true;
  if (tournament.status !== "in_progress") return false;
  return match.pointKeeperUserId === user.id;
}

/** Start/pause/finalize: point keeper only, or host override. */
export async function canRunMatchLifecycle(
  tournament: TournamentForPermissions,
  user: UserForPermissions,
  match: { pointKeeperUserId: string | null }
): Promise<boolean> {
  if (isTournamentArchived(tournament.date)) return false;
  if (await canHostOverrideMatchLifecycle(tournament, user)) return true;
  if (tournament.status !== "in_progress") return false;
  return match.pointKeeperUserId === user.id;
}

/** Claim a ref crew slot on the assigned ref team. */
export function canClaimRefCrewSlot(
  tournament: Pick<TournamentForPermissions, "status" | "date">,
  match: { refTeamId: string | null },
  userTeamIds: Iterable<string>
): boolean {
  if (isTournamentArchived(tournament.date)) return false;
  if (tournament.status !== "in_progress") return false;
  return isRefTeamMember(match, userTeamIds);
}

/** Become the active point keeper after claiming a scorekeeper slot. */
export function canBecomePointKeeper(
  tournament: Pick<TournamentForPermissions, "status" | "date">,
  match: { refTeamId: string | null },
  userTeamIds: Iterable<string>,
  viewerScorekeeperRole: boolean
): boolean {
  if (!canClaimRefCrewSlot(tournament, match, userTeamIds)) return false;
  return viewerScorekeeperRole;
}
