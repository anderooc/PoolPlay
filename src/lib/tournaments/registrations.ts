/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { db } from "@/lib/db";
import {
  registrationStatusEvents,
  registrations,
  schoolMembers,
  teamMembers,
  teams,
  tournamentWaitlistEntries,
  tournaments,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { teamRegistrationBlockReason } from "@/lib/tournaments/registration-eligibility";
import {
  canRegisterTeams,
  registrationGenderMismatchMessage,
  teamMatchesTournamentGender,
} from "@/lib/tournaments/permissions";
import {
  countSchoolRegistrationsForFee,
  createRegistrationPayment,
  type PaymentDbClient,
} from "@/lib/tournaments/payment-compliance";
import {
  OperationConflictError,
  OperationValidationError,
} from "@/lib/tournaments/competition-operation-rules";
import {
  allocateRegistrationCapacity,
  registrationDeadlinePassed,
} from "@/lib/tournaments/waitlist-policy";
import {
  lockRegistrationEligibilityRows,
  type LockedRegistrationTeam,
} from "@/lib/tournaments/registration-eligibility-locks";
import { isTournamentArchived } from "@/lib/tournament-status";

type DbClient = PaymentDbClient;
type RegistrationDatabase = Pick<typeof db, "transaction">;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MAX_TEAM_REGISTRATION_BATCH_SIZE = 32;

export type RegistrationPlacementResult = {
  acceptedCount: number;
  waitlistedCount: number;
  replayed: boolean;
};

export function registrationAvailabilityLockedStateError(
  tournamentDate: string,
  today?: string
): string | null {
  return isTournamentArchived(tournamentDate, today)
    ? "Archived tournament registration availability cannot be changed."
    : null;
}

export function registrationPlacementCachePolicy(
  replayed: boolean
): { listing: boolean; revalidateRoutePatterns: boolean } {
  return {
    listing: !replayed,
    revalidateRoutePatterns: !replayed,
  };
}

function isUniqueViolation(e: unknown): boolean {
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "23505"
  ) {
    return true;
  }
  if (typeof e === "object" && e !== null && "cause" in e) {
    return isUniqueViolation((e as { cause: unknown }).cause);
  }
  return false;
}

export async function insertTeamRegistration(
  tournamentId: string,
  teamId: string,
  status: "confirmed" | "pending",
  client: DbClient = db
): Promise<string> {
  try {
    const [inserted] = await client
      .insert(registrations)
      .values({
        teamId,
        tournamentId,
        divisionId: null,
        status,
      })
      .returning({ id: registrations.id });
    return inserted!.id;
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new OperationConflictError(
        "This team is already registered for this tournament."
      );
    }
    throw e;
  }
}

type RegistrationActor = {
  id: string;
  role: string;
};

type RegistrationTeamRow = LockedRegistrationTeam;

function registrationSelectionMatches(
  rows: Array<{ teamId: string }>,
  teamIds: string[]
): boolean {
  if (rows.length !== teamIds.length) return false;
  const selected = new Set(teamIds);
  return rows.every((row) => selected.has(row.teamId));
}

function replayPlacementMatches(
  acceptedRows: Array<{ teamId: string }>,
  waitlistedRows: Array<{ teamId: string }>,
  teamIds: string[]
): boolean {
  const acceptedTeamIds = teamIds.slice(0, acceptedRows.length);
  const waitlistedTeamIds = teamIds.slice(acceptedRows.length);
  return (
    registrationSelectionMatches(acceptedRows, acceptedTeamIds) &&
    registrationSelectionMatches(waitlistedRows, waitlistedTeamIds)
  );
}

async function resolveHostInsideTransaction(
  client: DbClient,
  tournament: typeof tournaments.$inferSelect,
  actor: RegistrationActor
): Promise<boolean> {
  const [currentActor] = await client
    .select({ role: users.role, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.id, actor.id))
    .for("share")
    .limit(1);
  if (!currentActor || currentActor.disabledAt != null) {
    throw new OperationValidationError("Your account cannot register teams.");
  }
  if (
    tournament.organizerId === actor.id ||
    currentActor.role === "admin"
  ) {
    return true;
  }
  if (!tournament.hostSchoolId) return false;

  const [officer] = await client
    .select({ id: schoolMembers.id })
    .from(schoolMembers)
    .where(
      and(
        eq(schoolMembers.schoolId, tournament.hostSchoolId),
        eq(schoolMembers.userId, actor.id),
        or(
          eq(schoolMembers.role, "president"),
          eq(schoolMembers.role, "officer")
        )
      )
    )
    .for("share")
    .limit(1);

  return officer != null;
}

async function lockAndLoadTournament(
  client: DbClient,
  tournamentId: string
): Promise<typeof tournaments.$inferSelect> {
  await client.execute(sql`
    SELECT id
    FROM ${tournaments}
    WHERE ${tournaments.id} = ${tournamentId}
    FOR UPDATE
  `);

  const [tournament] = await client
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament) {
    throw new OperationValidationError("Tournament not found.");
  }
  return tournament;
}

async function findReplayPlacement(
  client: DbClient,
  input: {
    tournamentId: string;
    teamIds: string[];
    actorId: string;
    operationId: string;
  }
): Promise<RegistrationPlacementResult | null> {
  const acceptedRows = await client
    .select({ teamId: registrationStatusEvents.teamId })
    .from(registrationStatusEvents)
    .where(
      and(
        eq(registrationStatusEvents.tournamentId, input.tournamentId),
        eq(registrationStatusEvents.actorUserId, input.actorId),
        eq(registrationStatusEvents.operationId, input.operationId),
        eq(registrationStatusEvents.reason, "registration_created")
      )
    );
  const waitlistedRows = await client
    .select({ teamId: tournamentWaitlistEntries.teamId })
    .from(tournamentWaitlistEntries)
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, input.tournamentId),
        eq(tournamentWaitlistEntries.requestedByUserId, input.actorId),
        eq(tournamentWaitlistEntries.requestOperationId, input.operationId)
      )
    );
  if (acceptedRows.length + waitlistedRows.length === 0) return null;
  if (!replayPlacementMatches(acceptedRows, waitlistedRows, input.teamIds)) {
    throw new OperationConflictError(
      "This registration operation was already used for a different team selection"
    );
  }
  return {
    acceptedCount: acceptedRows.length,
    waitlistedCount: waitlistedRows.length,
    replayed: true,
  };
}

async function loadRegistrationTeams(
  client: DbClient,
  teamIds: string[]
): Promise<Map<string, RegistrationTeamRow>> {
  return lockRegistrationEligibilityRows(client, teamIds);
}

export async function waitingTeamIdsForTournament(
  tournamentId: string,
  client: DbClient = db
): Promise<string[]> {
  const rows = await client
    .select({ teamId: tournamentWaitlistEntries.teamId })
    .from(tournamentWaitlistEntries)
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournamentId),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    );
  return rows.map((row) => row.teamId);
}

async function loadCaptainTeamIds(
  client: DbClient,
  actorId: string,
  teamIds: string[],
  isHost: boolean
): Promise<Set<string>> {
  if (isHost) return new Set(teamIds);
  const memberships = await client
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, actorId),
        inArray(teamMembers.teamId, teamIds)
      )
    )
    .for("share");
  return new Set(
    memberships
      .filter((membership) => membership.role === "captain")
      .map((membership) => membership.teamId)
  );
}

async function loadExistingPlacementTeamIds(
  client: DbClient,
  tournamentId: string,
  teamIds: string[]
): Promise<Set<string>> {
  const registrationRows = await client
    .select({ teamId: registrations.teamId })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        inArray(registrations.teamId, teamIds)
      )
    );
  const waitlistRows = await client
    .select({ teamId: tournamentWaitlistEntries.teamId })
    .from(tournamentWaitlistEntries)
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournamentId),
        inArray(tournamentWaitlistEntries.teamId, teamIds),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    );
  return new Set(
    [...registrationRows, ...waitlistRows].map((row) => row.teamId)
  );
}

function validateRegistrationBatch(input: {
  tournamentGender: (typeof tournaments.$inferSelect)["gender"];
  teamIds: string[];
  teamById: Map<string, RegistrationTeamRow>;
  captainTeamIds: Set<string>;
  existingTeamIds: Set<string>;
  isHost: boolean;
}): void {
  for (const teamId of input.teamIds) {
    const team = input.teamById.get(teamId);
    if (!team) throw new OperationValidationError("Team not found.");

    const block = teamRegistrationBlockReason(
      team.schoolId,
      team.schoolVerificationStatus,
      team.teamVerificationStatus
    );
    if (block) throw new OperationValidationError(block);
    if (!teamMatchesTournamentGender(team.gender, input.tournamentGender)) {
      throw new OperationValidationError(
        registrationGenderMismatchMessage(input.tournamentGender)
      );
    }
    if (!input.isHost && !input.captainTeamIds.has(teamId)) {
      throw new OperationValidationError(
        "Only team captains or the tournament host can register teams for this event"
      );
    }
    if (input.existingTeamIds.has(teamId)) {
      throw new OperationConflictError(
        "This team is already registered or waitlisted for this tournament."
      );
    }
  }
}

async function createRegistrationBatch(
  client: PaymentDbClient,
  input: {
    tournament: typeof tournaments.$inferSelect;
    teamIds: string[];
    teamById: Map<string, RegistrationTeamRow>;
    actorId: string;
    operationId: string;
    status: "confirmed" | "pending";
  }
): Promise<void> {
  for (const teamId of input.teamIds) {
    const team = input.teamById.get(teamId)!;
    const priorCount = await countSchoolRegistrationsForFee(
      input.tournament.id,
      team.schoolId,
      client
    );
    const registrationId = await insertTeamRegistration(
      input.tournament.id,
      teamId,
      input.status,
      client
    );
    await createRegistrationPayment(
      input.tournament,
      registrationId,
      teamId,
      team.schoolId,
      {
        client,
        priorSchoolRegistrationCount: priorCount,
        operationId: input.operationId,
        ...(input.status === "confirmed"
          ? { hostWaived: true, hostUserId: input.actorId }
          : {}),
      }
    );
    await client.insert(registrationStatusEvents).values({
      registrationId,
      tournamentId: input.tournament.id,
      teamId,
      fromStatus: null,
      toStatus: input.status,
      actorUserId: input.actorId,
      operationId: input.operationId,
      reason: "registration_created",
    });
  }
}

async function databaseNow(client: DbClient): Promise<Date> {
  const result = await client.execute<{ databaseNow: Date }>(sql`
    SELECT clock_timestamp() AS "databaseNow"
  `);
  const [row] = Array.isArray(result)
    ? result
    : (result as unknown as { rows: Array<{ databaseNow: Date }> }).rows;
  const value = row!.databaseNow;
  return value instanceof Date ? value : new Date(value);
}

async function countActiveRegistrations(
  client: DbClient,
  tournamentId: string
): Promise<number> {
  const [row] = await client
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(eq(registrations.tournamentId, tournamentId));
  return row?.count ?? 0;
}

async function hasActiveWaitlistEntries(
  client: DbClient,
  tournamentId: string
): Promise<boolean> {
  const [row] = await client
    .select({ id: tournamentWaitlistEntries.id })
    .from(tournamentWaitlistEntries)
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournamentId),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    )
    .limit(1);
  return row != null;
}

async function insertWaitlistBatch(
  client: PaymentDbClient,
  input: {
    tournamentId: string;
    teamIds: string[];
    actorId: string;
    operationId: string;
  }
): Promise<void> {
  if (input.teamIds.length === 0) return;
  try {
    await client.insert(tournamentWaitlistEntries).values(
      input.teamIds.map((teamId) => ({
        tournamentId: input.tournamentId,
        teamId,
        requestedByUserId: input.actorId,
        requestOperationId: input.operationId,
      }))
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new OperationConflictError(
        "One or more teams are already registered or waitlisted for this tournament."
      );
    }
    throw error;
  }
}

type RegisterTeamsInput = {
  tournamentId: string;
  teamIds: string[];
  actor: RegistrationActor;
  operationId: string;
};

function validateRegistrationInput(input: RegisterTeamsInput): string[] {
  const uniqueIds = [...new Set(input.teamIds.filter(Boolean))];
  if (!UUID_RE.test(input.tournamentId)) {
    throw new OperationValidationError("Tournament ID is invalid.");
  }
  if (!UUID_RE.test(input.operationId)) {
    throw new OperationValidationError("Registration operation is invalid.");
  }
  if (uniqueIds.length === 0) {
    throw new OperationValidationError("Select at least one team.");
  }
  if (uniqueIds.length > MAX_TEAM_REGISTRATION_BATCH_SIZE) {
    throw new OperationValidationError(
      `Select no more than ${MAX_TEAM_REGISTRATION_BATCH_SIZE} teams at once.`
    );
  }
  if (uniqueIds.some((teamId) => !UUID_RE.test(teamId))) {
    throw new OperationValidationError("One or more team IDs are invalid.");
  }
  return uniqueIds;
}

async function loadAndValidateTeams(
  client: DbClient,
  tournament: typeof tournaments.$inferSelect,
  input: RegisterTeamsInput,
  teamIds: string[]
): Promise<{ isHost: boolean; teamById: Map<string, RegistrationTeamRow> }> {
  const isHost = await resolveHostInsideTransaction(
    client,
    tournament,
    input.actor
  );
  const teamById = await loadRegistrationTeams(client, teamIds);
  const captainTeamIds = await loadCaptainTeamIds(
    client,
    input.actor.id,
    teamIds,
    isHost
  );
  const existingTeamIds = await loadExistingPlacementTeamIds(
    client,
    input.tournamentId,
    teamIds
  );
  validateRegistrationBatch({
    tournamentGender: tournament.gender,
    teamIds,
    teamById,
    captainTeamIds,
    existingTeamIds,
    isHost,
  });
  return { isHost, teamById };
}

async function placeValidatedTeams(
  client: PaymentDbClient,
  tournament: typeof tournaments.$inferSelect,
  input: RegisterTeamsInput,
  teamIds: string[],
  validated: { isHost: boolean; teamById: Map<string, RegistrationTeamRow> }
): Promise<RegistrationPlacementResult> {
  const activeRegistrationCount = await countActiveRegistrations(
    client,
    tournament.id
  );
  const activeQueueExists = await hasActiveWaitlistEntries(
    client,
    tournament.id
  );
  const allocation = activeQueueExists
    ? { acceptedTeamIds: [], waitlistedTeamIds: teamIds }
    : allocateRegistrationCapacity({
        teamIds,
        capacity: tournament.registrationCapacity,
        activeRegistrationCount,
      });
  await createRegistrationBatch(client, {
    tournament,
    teamIds: allocation.acceptedTeamIds,
    teamById: validated.teamById,
    actorId: input.actor.id,
    operationId: input.operationId,
    status: validated.isHost ? "confirmed" : "pending",
  });
  await insertWaitlistBatch(client, {
    tournamentId: tournament.id,
    teamIds: allocation.waitlistedTeamIds,
    actorId: input.actor.id,
    operationId: input.operationId,
  });
  return {
    acceptedCount: allocation.acceptedTeamIds.length,
    waitlistedCount: allocation.waitlistedTeamIds.length,
    replayed: false,
  };
}

async function placeRegistrationTransaction(
  client: PaymentDbClient,
  input: RegisterTeamsInput,
  teamIds: string[]
): Promise<RegistrationPlacementResult> {
  const tournament = await lockAndLoadTournament(client, input.tournamentId);
  const authoritativeNow = await databaseNow(client);
  const replay = await findReplayPlacement(client, {
    tournamentId: input.tournamentId,
    teamIds,
    actorId: input.actor.id,
    operationId: input.operationId,
  });
  if (replay) return replay;
  if (
    registrationDeadlinePassed(
      tournament.registrationDeadline,
      authoritativeNow
    )
  ) {
    throw new OperationValidationError("The registration deadline has passed.");
  }
  if (!canRegisterTeams(tournament)) {
    throw new OperationValidationError(
      "Registration is not open for this tournament. Contact the host if you need to sign up."
    );
  }
  const validated = await loadAndValidateTeams(
    client,
    tournament,
    input,
    teamIds
  );
  return placeValidatedTeams(client, tournament, input, teamIds, validated);
}

export async function registerTeamsAtomically(
  input: RegisterTeamsInput,
  database: RegistrationDatabase = db
): Promise<RegistrationPlacementResult> {
  const teamIds = validateRegistrationInput(input);
  return database.transaction((tx) =>
    placeRegistrationTransaction(tx, input, teamIds)
  );
}

/** Auto-register all teams under the hosting school as confirmed. */
export async function registerHostSchoolTeamsOnCreate(
  tournamentId: string,
  hostSchoolId: string,
  actorUserId: string,
  client: DbClient = db,
  operationId: string = crypto.randomUUID()
): Promise<void> {
  const schoolTeams = await client
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.schoolId, hostSchoolId));

  for (const team of schoolTeams) {
    const registrationId = await insertTeamRegistration(
      tournamentId,
      team.id,
      "confirmed",
      client
    );
    await client.insert(registrationStatusEvents).values({
      registrationId,
      tournamentId,
      teamId: team.id,
      fromStatus: null,
      toStatus: "confirmed",
      actorUserId,
      operationId,
      reason: "host_school_registration_created",
    });
  }
}
