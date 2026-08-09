/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  registrationStatusEvents,
  registrations,
  teamMembers,
  tournamentWaitlistEntries,
  tournaments,
} from "@/lib/db/schema";
import {
  OperationConflictError,
  OperationValidationError,
} from "@/lib/tournaments/competition-operation-rules";
import {
  countSchoolRegistrationsForFee,
  createRegistrationPayment,
} from "@/lib/tournaments/payment-compliance";
import type { PaymentDbClient } from "@/lib/tournaments/payment-compliance";
import { teamMatchesTournamentGender } from "@/lib/tournaments/permissions";
import { teamRegistrationBlockReason } from "@/lib/tournaments/registration-eligibility";
import {
  actorIsOrganizer,
  lockTournament,
  validateRosterStage,
} from "@/lib/tournaments/registration-roster-mutations";
import { insertTeamRegistration } from "@/lib/tournaments/registrations";
import {
  selectOldestEligibleWaitlistEntry,
  type EligibleWaitlistEntry,
} from "@/lib/tournaments/waitlist-selection";
import { lockRegistrationEligibilityRows } from "@/lib/tournaments/registration-eligibility-locks";

type PromotionResult = {
  waitlistEntryId: string;
  registrationId: string;
  teamId: string;
  replayed: boolean;
};

type PromotionInput = {
  tournamentId: string;
  actorUserId: string;
  operationId: string;
};

type WaitlistDatabase = Pick<typeof db, "transaction">;

type PromotionCandidate = EligibleWaitlistEntry & {
  teamId: string;
  schoolId: string | null;
};

async function registeredCandidateTeamIds(
  client: PaymentDbClient,
  tournamentId: string,
  teamIds: string[]
): Promise<Set<string>> {
  const rows = await client
    .select({ teamId: registrations.teamId })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        inArray(registrations.teamId, teamIds)
      )
    );
  return new Set(rows.map((row) => row.teamId));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new OperationValidationError(`${label} is invalid.`);
  }
}

async function requireOrganizer(
  client: PaymentDbClient,
  tournament: typeof tournaments.$inferSelect,
  actorUserId: string
): Promise<void> {
  if (
    !(await actorIsOrganizer(
      client as unknown as typeof db,
      tournament,
      actorUserId
    ))
  ) {
    throw new OperationValidationError(
      "Only the organizer can update the tournament waitlist."
    );
  }
}

async function findPromotionReplay(
  client: PaymentDbClient,
  input: PromotionInput
): Promise<PromotionResult | null> {
  const [row] = await client
    .select({
      id: tournamentWaitlistEntries.id,
      teamId: tournamentWaitlistEntries.teamId,
      status: tournamentWaitlistEntries.status,
      registrationId: tournamentWaitlistEntries.registrationId,
    })
    .from(tournamentWaitlistEntries)
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, input.tournamentId),
        eq(tournamentWaitlistEntries.resolutionOperationId, input.operationId)
      )
    )
    .limit(1);
  if (!row) return null;
  if (
    row.status !== "promoted" ||
    !row.registrationId
  ) {
    throw new OperationConflictError(
      "This waitlist operation was already used for another resolution."
    );
  }
  return {
    waitlistEntryId: row.id,
    registrationId: row.registrationId,
    teamId: row.teamId,
    replayed: true,
  };
}

async function loadPromotionCandidates(
  client: PaymentDbClient,
  tournament: typeof tournaments.$inferSelect
): Promise<PromotionCandidate[]> {
  const rows = await client
    .select({
      id: tournamentWaitlistEntries.id,
      teamId: tournamentWaitlistEntries.teamId,
      queuePosition: tournamentWaitlistEntries.queuePosition,
    })
    .from(tournamentWaitlistEntries)
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournament.id),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    )
    .orderBy(asc(tournamentWaitlistEntries.queuePosition));
  if (rows.length === 0) return [];
  const lockedTeams = await lockRegistrationEligibilityRows(
    client,
    rows.map((row) => row.teamId)
  );
  const registeredIds = await registeredCandidateTeamIds(
    client,
    tournament.id,
    rows.map((row) => row.teamId)
  );
  return rows.map((row) => {
    const team = lockedTeams.get(row.teamId);
    return {
      id: row.id,
      teamId: row.teamId,
      queuePosition: row.queuePosition,
      schoolId: team?.schoolId ?? null,
      eligible:
        team != null &&
        !registeredIds.has(row.teamId) &&
        teamRegistrationBlockReason(
          team.schoolId,
          team.schoolVerificationStatus,
          team.teamVerificationStatus
        ) == null &&
        teamMatchesTournamentGender(team.gender, tournament.gender),
    };
  });
}

async function assertOpenCapacity(
  client: PaymentDbClient,
  tournament: typeof tournaments.$inferSelect
): Promise<void> {
  if (tournament.registrationCapacity == null) return;
  const [row] = await client
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(eq(registrations.tournamentId, tournament.id));
  if ((row?.count ?? 0) >= tournament.registrationCapacity) {
    throw new OperationConflictError(
      "No registration slots are available for waitlist promotion."
    );
  }
}

async function createPromotionEffects(
  client: PaymentDbClient,
  tournament: typeof tournaments.$inferSelect,
  candidate: PromotionCandidate,
  input: PromotionInput
): Promise<PromotionResult> {
  const registrationId = await createPromotedRegistration(
    client,
    tournament,
    candidate,
    input
  );
  await markWaitlistPromoted(client, tournament, candidate, input, registrationId);
  return {
    waitlistEntryId: candidate.id,
    registrationId,
    teamId: candidate.teamId,
    replayed: false,
  };
}

async function createPromotedRegistration(
  client: PaymentDbClient,
  tournament: typeof tournaments.$inferSelect,
  candidate: PromotionCandidate,
  input: PromotionInput
): Promise<string> {
  const priorCount = await countSchoolRegistrationsForFee(
    tournament.id,
    candidate.schoolId,
    client
  );
  const registrationId = await insertTeamRegistration(
    tournament.id,
    candidate.teamId,
    "pending",
    client
  );
  await createRegistrationPayment(
    tournament,
    registrationId,
    candidate.teamId,
    candidate.schoolId,
    {
      client,
      priorSchoolRegistrationCount: priorCount,
      operationId: input.operationId,
    }
  );
  await client.insert(registrationStatusEvents).values({
    registrationId,
    tournamentId: tournament.id,
    teamId: candidate.teamId,
    fromStatus: null,
    toStatus: "pending",
    actorUserId: input.actorUserId,
    operationId: input.operationId,
    reason: "waitlist_promoted",
  });
  return registrationId;
}

async function markWaitlistPromoted(
  client: PaymentDbClient,
  tournament: typeof tournaments.$inferSelect,
  candidate: PromotionCandidate,
  input: PromotionInput,
  registrationId: string
): Promise<void> {
  const [resolved] = await client
    .update(tournamentWaitlistEntries)
    .set({
      status: "promoted",
      resolvedAt: sql`clock_timestamp()`,
      resolvedByUserId: input.actorUserId,
      resolutionOperationId: input.operationId,
      registrationId,
    })
    .where(
      and(
        eq(tournamentWaitlistEntries.id, candidate.id),
        eq(tournamentWaitlistEntries.tournamentId, tournament.id),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    )
    .returning({ id: tournamentWaitlistEntries.id });
  if (!resolved) {
    throw new OperationConflictError(
      "The next waitlist entry changed. Refresh and try again."
    );
  }
}

async function promoteInTransaction(
  client: PaymentDbClient,
  input: PromotionInput
): Promise<PromotionResult> {
  const tournament = await lockTournament(
    client as unknown as typeof db,
    input.tournamentId
  );
  await requireOrganizer(client, tournament, input.actorUserId);
  const replay = await findPromotionReplay(client, input);
  if (replay) return replay;
  validateRosterStage(tournament, "edit");
  await assertOpenCapacity(client, tournament);
  const candidate = selectOldestEligibleWaitlistEntry(
    await loadPromotionCandidates(client, tournament)
  );
  if (!candidate) {
    throw new OperationConflictError(
      "No currently eligible teams are waiting for this tournament."
    );
  }
  return createPromotionEffects(client, tournament, candidate, input);
}

export async function promoteNextWaitlistedTeamAtomically(
  input: PromotionInput,
  database: WaitlistDatabase = db
): Promise<PromotionResult> {
  requireUuid(input.tournamentId, "Tournament ID");
  requireUuid(input.actorUserId, "Actor user ID");
  requireUuid(input.operationId, "Waitlist operation ID");
  return database.transaction((tx) => promoteInTransaction(tx, input));
}

async function actorIsTeamCaptain(
  client: PaymentDbClient,
  tournament: typeof tournaments.$inferSelect,
  teamId: string,
  actorUserId: string
): Promise<boolean> {
  // Reload the live account state, but keep organizer resolution on "removed".
  await actorIsOrganizer(
    client as unknown as typeof db,
    tournament,
    actorUserId
  );
  const [captain] = await client
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, actorUserId),
        eq(teamMembers.role, "captain")
      )
    )
    .for("share")
    .limit(1);
  return captain != null;
}

async function resolveWaitingEntry(
  client: PaymentDbClient,
  input: {
    tournamentId: string;
    actorUserId: string;
    status: "withdrawn" | "removed";
    teamId?: string;
    waitlistEntryId?: string;
  }
): Promise<void> {
  const target = input.teamId
    ? eq(tournamentWaitlistEntries.teamId, input.teamId)
    : eq(tournamentWaitlistEntries.id, input.waitlistEntryId!);
  const [resolved] = await client
    .update(tournamentWaitlistEntries)
    .set({
      status: input.status,
      resolvedAt: sql`clock_timestamp()`,
      resolvedByUserId: input.actorUserId,
      resolutionOperationId: crypto.randomUUID(),
    })
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, input.tournamentId),
        eq(tournamentWaitlistEntries.status, "waiting"),
        target
      )
    )
    .returning({ id: tournamentWaitlistEntries.id });
  if (!resolved) {
    throw new OperationConflictError(
      "This team is not currently waiting for this tournament."
    );
  }
}

export async function withdrawWaitlistEntryAtomically(input: {
  tournamentId: string;
  teamId: string;
  actorUserId: string;
}, database: WaitlistDatabase = db): Promise<void> {
  requireUuid(input.tournamentId, "Tournament ID");
  requireUuid(input.teamId, "Team ID");
  requireUuid(input.actorUserId, "Actor user ID");
  await database.transaction(async (tx) => {
    const tournament = await lockTournament(
      tx as unknown as typeof db,
      input.tournamentId
    );
    validateRosterStage(tournament, "withdraw");
    if (!(await actorIsTeamCaptain(tx, tournament, input.teamId, input.actorUserId))) {
      throw new OperationValidationError(
        "Only the team captain may withdraw this waitlist entry."
      );
    }
    await resolveWaitingEntry(tx, { ...input, status: "withdrawn" });
  });
}

export async function removeWaitlistEntryAtomically(input: {
  tournamentId: string;
  waitlistEntryId: string;
  actorUserId: string;
}, database: WaitlistDatabase = db): Promise<void> {
  requireUuid(input.tournamentId, "Tournament ID");
  requireUuid(input.waitlistEntryId, "Waitlist entry ID");
  requireUuid(input.actorUserId, "Actor user ID");
  await database.transaction(async (tx) => {
    const tournament = await lockTournament(
      tx as unknown as typeof db,
      input.tournamentId
    );
    await requireOrganizer(tx, tournament, input.actorUserId);
    validateRosterStage(tournament, "edit");
    await resolveWaitingEntry(tx, { ...input, status: "removed" });
  });
}
