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

export const MATCH_REF_CREW_ROLES = [
  "up_ref",
  "down_ref",
  "line_ref_1",
  "line_ref_2",
  "scorekeeper_1",
  "scorekeeper_2",
  "scorekeeper_3",
] as const;

export type MatchRefCrewRole = (typeof MATCH_REF_CREW_ROLES)[number];

export const SCOREKEEPER_ROLES = [
  "scorekeeper_1",
  "scorekeeper_2",
  "scorekeeper_3",
] as const satisfies readonly MatchRefCrewRole[];

export const MATCH_REF_CREW_ROLE_LABELS: Record<MatchRefCrewRole, string> = {
  up_ref: "Up ref",
  down_ref: "Down ref",
  line_ref_1: "Line ref 1",
  line_ref_2: "Line ref 2",
  scorekeeper_1: "Scorekeeper 1",
  scorekeeper_2: "Scorekeeper 2",
  scorekeeper_3: "Scorekeeper 3",
};

/** Slots that should be filled for a complete crew (scorekeepers optional beyond 1). */
export const REQUIRED_MATCH_REF_CREW_ROLES: MatchRefCrewRole[] = [
  "up_ref",
  "down_ref",
  "line_ref_1",
  "line_ref_2",
  "scorekeeper_1",
];

export function isScorekeeperRole(role: MatchRefCrewRole): boolean {
  return (SCOREKEEPER_ROLES as readonly string[]).includes(role);
}

export function parseMatchRefCrewRole(
  value: unknown
): MatchRefCrewRole | "invalid" {
  if (typeof value !== "string") return "invalid";
  return (MATCH_REF_CREW_ROLES as readonly string[]).includes(value)
    ? (value as MatchRefCrewRole)
    : "invalid";
}

export interface MatchRefCrewSlot {
  role: MatchRefCrewRole;
  label: string;
  userId: string | null;
  fullName: string | null;
  claimedAt: string | null;
  required: boolean;
}

export interface MatchRefCrewState {
  slots: MatchRefCrewSlot[];
  pointKeeperUserId: string | null;
  pointKeeperFullName: string | null;
  missingRequiredRoles: MatchRefCrewRole[];
  isCrewComplete: boolean;
  viewerSlot: MatchRefCrewRole | null;
  viewerIsPointKeeper: boolean;
}

export function buildMatchRefCrewState(input: {
  assignments: {
    role: MatchRefCrewRole;
    userId: string;
    fullName: string;
    claimedAt: Date;
  }[];
  pointKeeperUserId: string | null;
  pointKeeperFullName: string | null;
  viewerUserId: string;
}): MatchRefCrewState {
  const byRole = new Map(input.assignments.map((row) => [row.role, row]));
  const slots: MatchRefCrewSlot[] = MATCH_REF_CREW_ROLES.map((role) => {
    const row = byRole.get(role);
    return {
      role,
      label: MATCH_REF_CREW_ROLE_LABELS[role],
      userId: row?.userId ?? null,
      fullName: row?.fullName ?? null,
      claimedAt: row?.claimedAt.toISOString() ?? null,
      required: REQUIRED_MATCH_REF_CREW_ROLES.includes(role),
    };
  });

  const missingRequiredRoles = REQUIRED_MATCH_REF_CREW_ROLES.filter(
    (role) => !byRole.has(role)
  );

  const viewerAssignment = input.assignments.find(
    (row) => row.userId === input.viewerUserId
  );

  return {
    slots,
    pointKeeperUserId: input.pointKeeperUserId,
    pointKeeperFullName: input.pointKeeperFullName,
    missingRequiredRoles,
    isCrewComplete: missingRequiredRoles.length === 0,
    viewerSlot: viewerAssignment?.role ?? null,
    viewerIsPointKeeper: input.pointKeeperUserId === input.viewerUserId,
  };
}
