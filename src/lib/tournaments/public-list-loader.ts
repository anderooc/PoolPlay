/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { and, asc, countDistinct, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  registrations,
  schools,
  tournamentWaitlistEntries,
  tournaments,
} from "@/lib/db/schema";
import type { TournamentHostSchool } from "./host-school";
import { tournamentListColumns } from "./list-columns";
import { buildPublicTournamentListProjection } from "./public-projection";

const publicTournamentListColumns = {
  slug: tournaments.slug,
  name: tournaments.name,
  description: tournaments.description,
  location: tournaments.location,
  date: tournaments.date,
  status: tournaments.status,
  gender: tournaments.gender,
  region: tournaments.region,
  hostSchoolId: tournaments.hostSchoolId,
  registrationCapacity: tournaments.registrationCapacity,
  registrationDeadline: tournaments.registrationDeadline,
};

type PublicTournamentListDatabase = Pick<typeof db, "transaction">;
type PublicListTransaction = Parameters<
  Parameters<PublicTournamentListDatabase["transaction"]>[0]
>[0];

async function listPublicTournamentRows(tx: PublicListTransaction) {
  return tx
    .select({ id: tournaments.id, ...publicTournamentListColumns })
    .from(tournaments)
    .where(ne(tournaments.status, "draft"))
    .orderBy(desc(tournaments.date));
}

async function listTournamentGridRows(tx: PublicListTransaction) {
  return tx
    .select({
      ...tournamentListColumns,
      registrationCapacity: tournaments.registrationCapacity,
      registrationDeadline: tournaments.registrationDeadline,
    })
    .from(tournaments)
    .orderBy(asc(tournaments.date));
}

async function listPublicAvailability(
  tx: PublicListTransaction,
  tournamentIds: string[]
) {
  if (tournamentIds.length === 0) return [];
  return tx
    .select({
      tournamentId: tournaments.id,
      registeredCount: countDistinct(registrations.id),
      waitlistCount: countDistinct(tournamentWaitlistEntries.id),
    })
    .from(tournaments)
    .leftJoin(
      registrations,
      eq(registrations.tournamentId, tournaments.id)
    )
    .leftJoin(
      tournamentWaitlistEntries,
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournaments.id),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    )
    .where(inArray(tournaments.id, tournamentIds))
    .groupBy(tournaments.id);
}

type PublicTournamentRows = Awaited<ReturnType<typeof listPublicTournamentRows>>;
type PublicAvailabilityRows = Awaited<ReturnType<typeof listPublicAvailability>>;
interface AvailabilitySourceRow {
  id: string;
  hostSchoolId: string | null;
  registrationCapacity: number | null;
  registrationDeadline: Date | null;
}

function withRegistrationAvailability<T extends AvailabilitySourceRow>(
  rows: T[],
  availabilityRows: PublicAvailabilityRows
) {
  const byTournament = new Map(
    availabilityRows.map((row) => [row.tournamentId, row])
  );
  return rows.map((row) => {
    const aggregate = byTournament.get(row.id);
    return {
      ...row,
      registrationAvailability: {
        capacity: row.registrationCapacity,
        deadline: row.registrationDeadline?.toISOString() ?? null,
        registeredCount: aggregate?.registeredCount ?? 0,
        waitlistCount: aggregate?.waitlistCount ?? 0,
      },
    };
  });
}

async function enrichPublicHostSchools<T extends { hostSchoolId: string | null }>(
  tx: PublicListTransaction,
  rows: T[]
) {
  const ids = [
    ...new Set(rows.map((row) => row.hostSchoolId).filter(Boolean)),
  ] as string[];
  const hostRows = ids.length === 0
    ? []
    : await tx
        .select({
          id: schools.id,
          name: schools.name,
          slug: schools.slug,
          verificationStatus: schools.verificationStatus,
        })
        .from(schools)
        .where(inArray(schools.id, ids));
  const byId = new Map<string, TournamentHostSchool>(
    hostRows.map(({ id, ...school }) => [id, school])
  );
  return rows.map((row) => ({
    ...row,
    hostSchool: row.hostSchoolId
      ? (byId.get(row.hostSchoolId) ?? null)
      : null,
  }));
}

export interface PublicTournamentListDependencies {
  database: PublicTournamentListDatabase;
  listTournaments: (tx: PublicListTransaction) => Promise<PublicTournamentRows>;
  listAvailability: (
    tx: PublicListTransaction,
    ids: string[]
  ) => Promise<PublicAvailabilityRows>;
  enrichHostSchools: (
    tx: PublicListTransaction,
    rows: ReturnType<typeof withRegistrationAvailability<PublicTournamentRows[number]>>
  ) => Promise<
    Array<
      ReturnType<
        typeof withRegistrationAvailability<PublicTournamentRows[number]>
      >[number] & { hostSchool: TournamentHostSchool | null }
    >
  >;
}

const productionDependencies: PublicTournamentListDependencies = {
  database: db,
  listTournaments: listPublicTournamentRows,
  listAvailability: listPublicAvailability,
  enrichHostSchools: enrichPublicHostSchools,
};

async function loadPublicTournamentSnapshot(
  tx: PublicListTransaction,
  dependencies: PublicTournamentListDependencies
) {
  const rows = await dependencies.listTournaments(tx);
  const availabilityRows = await dependencies.listAvailability(
    tx,
    rows.map((row) => row.id)
  );
  const sourceRows = withRegistrationAvailability(rows, availabilityRows);
  const enrichedRows = await dependencies.enrichHostSchools(tx, sourceRows);
  return buildPublicTournamentListProjection(enrichedRows);
}

async function loadTournamentGridSnapshot(tx: PublicListTransaction) {
  const rows = await listTournamentGridRows(tx);
  const availability = await listPublicAvailability(
    tx,
    rows.map((row) => row.id)
  );
  return enrichPublicHostSchools(
    tx,
    withRegistrationAvailability(rows, availability)
  );
}

export async function loadPublicTournamentList(
  dependencies: PublicTournamentListDependencies = productionDependencies
) {
  return dependencies.database.transaction(
    (tx) => loadPublicTournamentSnapshot(tx, dependencies),
    { isolationLevel: "repeatable read", accessMode: "read only" }
  );
}

export async function loadTournamentGridList(
  database: PublicTournamentListDatabase = db
) {
  return database.transaction(loadTournamentGridSnapshot, {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
}
