/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  registrations,
  teamMembers,
  teams,
  tournamentWaitlistEntries,
  tournaments,
} from "@/lib/db/schema";
import { withdrawWaitlistEntryAtomically } from "./waitlist-operations";

export interface ApplicantWaitlistRow {
  teamId: string;
  teamName: string;
  university: string;
  queueRank: number;
}

interface ApplicantWaitlistSourceRow
  extends Omit<ApplicantWaitlistRow, "queueRank"> {
  queuePosition: number;
}

async function loadWaitingQueuePositions(
  tx: ApplicantReadTransaction,
  tournamentId: string
) {
  return tx
    .select({ queuePosition: tournamentWaitlistEntries.queuePosition })
    .from(tournamentWaitlistEntries)
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournamentId),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    )
    .orderBy(asc(tournamentWaitlistEntries.queuePosition));
}

function withLocalQueueRanks(
  rows: ApplicantWaitlistSourceRow[],
  positions: Array<{ queuePosition: number }>
): ApplicantWaitlistRow[] {
  const rankByPosition = new Map(
    positions.map((row, index) => [row.queuePosition, index + 1])
  );
  return rows.map(({ queuePosition, ...row }) => ({
    ...row,
    queueRank: rankByPosition.get(queuePosition) ?? 0,
  }));
}

type ApplicantWaitlistDatabase = Pick<typeof db, "transaction">;
type ApplicantReadTransaction = Parameters<
  Parameters<ApplicantWaitlistDatabase["transaction"]>[0]
>[0];

async function loadApplicantRows(
  tx: ApplicantReadTransaction,
  tournamentId: string,
  userId: string
): Promise<ApplicantWaitlistRow[]> {
  const rows: ApplicantWaitlistSourceRow[] = await tx
    .select({
      teamId: tournamentWaitlistEntries.teamId,
      teamName: teams.name,
      university: teams.university,
      queuePosition: tournamentWaitlistEntries.queuePosition,
    })
    .from(tournamentWaitlistEntries)
    .innerJoin(teams, eq(tournamentWaitlistEntries.teamId, teams.id))
    .innerJoin(
      teamMembers,
      and(
        eq(teamMembers.teamId, tournamentWaitlistEntries.teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, "captain")
      )
    )
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournamentId),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    )
    .orderBy(asc(tournamentWaitlistEntries.queuePosition));
  const positions = await loadWaitingQueuePositions(tx, tournamentId);
  return withLocalQueueRanks(rows, positions);
}

async function loadRegistrationSettings(
  tx: ApplicantReadTransaction,
  tournamentId: string
) {
  const [row] = await tx
    .select({
      status: tournaments.status,
      registrationCapacity: tournaments.registrationCapacity,
      registrationDeadline: tournaments.registrationDeadline,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  return row ?? null;
}

export async function loadApplicantWaitlistState(
  input: { tournamentId: string; userId: string },
  database: ApplicantWaitlistDatabase = db
) {
  return database.transaction(
    async (tx) => {
      const [settings, registeredRows, [waiting], applicantWaitlistRows] =
        await Promise.all([
          loadRegistrationSettings(tx, input.tournamentId),
          tx
            .select({ teamId: registrations.teamId })
            .from(registrations)
            .where(eq(registrations.tournamentId, input.tournamentId)),
          tx
            .select({ value: count(tournamentWaitlistEntries.id) })
            .from(tournamentWaitlistEntries)
            .where(
              and(
                eq(tournamentWaitlistEntries.tournamentId, input.tournamentId),
                eq(tournamentWaitlistEntries.status, "waiting")
              )
            ),
          loadApplicantRows(tx, input.tournamentId, input.userId),
        ]);
      const waitlistCount = waiting?.value ?? 0;
      return {
        registrationAvailability: settings
          ? {
              status: settings.status,
              capacity: settings.registrationCapacity,
              deadline: settings.registrationDeadline?.toISOString() ?? null,
              registeredCount: registeredRows.length,
              waitlistCount,
            }
          : null,
        registeredRows,
        applicantWaitlistRows,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" }
  );
}

export async function withdrawApplicantWaitlistEntry(
  input: { tournamentId: string; teamId: string; actorUserId: string },
  onSuccess: () => Promise<void>,
  database: ApplicantWaitlistDatabase = db
): Promise<void> {
  await withdrawWaitlistEntryAtomically(input, database);
  await onSuccess();
}
