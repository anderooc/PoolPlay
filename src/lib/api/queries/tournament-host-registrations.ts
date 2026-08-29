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

import { and, asc, eq, inArray } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  divisions,
  registrations,
  schools,
  teams,
  tournamentWaitlistEntries,
} from "@/lib/db/schema";
import { notifyTeamCaptainsOfRegistrationUpdate } from "@/lib/notifications/tournament-events";
import {
  syncDivisionAutoPoolMembers,
  syncManyDivisionPools,
} from "@/lib/tournaments/division-pools";
import {
  getPaymentsByRegistrationIds,
  paymentBlocksConfirm,
} from "@/lib/tournaments/payment-compliance";
import { paymentSettingsFromTournament } from "@/lib/tournaments/payment-settings";
import {
  canCheckInRegistrations,
  canEditRegistrations,
  resolveIsTournamentOrganizer,
  teamMatchesTournamentGender,
} from "@/lib/tournaments/permissions";
import { removeRegistrationsAtomically } from "@/lib/tournaments/registration-roster-mutations";
import { teamRegistrationBlockReason } from "@/lib/tournaments/registration-eligibility";
import { invalidatePublicTournamentCachesByIds } from "@/lib/tournaments/public-cache-invalidation";
import {
  getTeamsWaiverSummary,
  waiverBlocksCheckIn,
} from "@/lib/tournaments/waiver-compliance";
import { waiverSettingsFromTournament } from "@/lib/tournaments/waiver-access";
import { withTournamentQueueRanks } from "@/lib/tournaments/waitlist-rank";
import {
  promoteNextWaitlistedTeamAtomically,
  removeWaitlistEntryAtomically,
} from "@/lib/tournaments/waitlist-operations";
import {
  OperationConflictError,
  OperationValidationError,
} from "@/lib/tournaments/competition-operation-rules";
import type {
  TournamentHostBulkMutationResultContract,
  TournamentHostRegistrationsContract,
  TournamentHostRegistrationsResultContract,
  TournamentHostWaitlistPromoteResultContract,
} from "../contracts/tournament-host";
import { badRequest, notFound } from "../errors";
import { requireHostTournament } from "./tournament-host";

function waitlistDomainError(error: unknown): string | null {
  if (
    error instanceof OperationConflictError ||
    error instanceof OperationValidationError
  ) {
    return error.message;
  }
  return null;
}

function competitionOperationError(error: unknown): string {
  const message = waitlistDomainError(error);
  if (message) return message;
  return "Could not update tournament data. Try again.";
}

async function loadRegistrationRows(tournamentId: string) {
  return db
    .select({
      id: registrations.id,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      teamId: teams.id,
      teamSlug: teams.slug,
      teamName: teams.name,
      schoolId: teams.schoolId,
      schoolName: schools.name,
      divisionId: divisions.id,
      divisionName: divisions.name,
    })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .leftJoin(divisions, eq(registrations.divisionId, divisions.id))
    .where(eq(registrations.tournamentId, tournamentId))
    .orderBy(asc(registrations.registeredAt), asc(teams.name));
}

async function loadDivisionOptions(tournamentId: string) {
  return db
    .select({ id: divisions.id, name: divisions.name })
    .from(divisions)
    .where(eq(divisions.tournamentId, tournamentId))
    .orderBy(asc(divisions.name), asc(divisions.id));
}

async function loadOrganizerWaitlist(tournamentId: string) {
  return db
    .select({
      id: tournamentWaitlistEntries.id,
      position: tournamentWaitlistEntries.queuePosition,
      requestedAt: tournamentWaitlistEntries.requestedAt,
      teamId: teams.id,
      teamName: teams.name,
      teamUniversity: teams.university,
      teamGender: teams.gender,
      teamStatus: teams.verificationStatus,
      schoolId: teams.schoolId,
      schoolName: schools.name,
      schoolStatus: schools.verificationStatus,
    })
    .from(tournamentWaitlistEntries)
    .innerJoin(teams, eq(tournamentWaitlistEntries.teamId, teams.id))
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournamentId),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    )
    .orderBy(asc(tournamentWaitlistEntries.queuePosition));
}

async function buildRegistrationsContract(
  tournament: Awaited<ReturnType<typeof requireHostTournament>>,
  user: AppUser
): Promise<TournamentHostRegistrationsContract> {
  const [canManage, canCheckIn, rows, divisionOptions, waitingRows] =
    await Promise.all([
      canEditRegistrations(tournament, user),
      canCheckInRegistrations(tournament, user),
      loadRegistrationRows(tournament.id),
      loadDivisionOptions(tournament.id),
      loadOrganizerWaitlist(tournament.id),
    ]);

  const paymentSettings = paymentSettingsFromTournament(tournament);
  const waiverEnabled = tournament.waiverEnabled;
  const waiverSettings = waiverSettingsFromTournament(tournament);
  const paymentEnabled = tournament.paymentEnabled;

  const [waiverSummary, paymentSummary] = await Promise.all([
    waiverEnabled
      ? getTeamsWaiverSummary(
          tournament,
          rows.map((row) => row.teamId)
        )
      : Promise.resolve(new Map()),
    paymentEnabled && rows.length > 0
      ? getPaymentsByRegistrationIds(rows.map((row) => row.id))
      : Promise.resolve(new Map()),
  ]);

  const registeredTeamIds = new Set(rows.map((row) => row.teamId));
  const waitlist = withTournamentQueueRanks(waitingRows).map((row) => ({
    id: row.id,
    queueRank: row.queueRank,
    teamName: row.teamName,
    schoolName: row.schoolName ?? row.teamUniversity ?? "Independent team",
    requestedAt: row.requestedAt.toISOString(),
    eligible:
      !registeredTeamIds.has(row.teamId) &&
      teamRegistrationBlockReason(
        row.schoolId,
        row.schoolStatus,
        row.teamStatus
      ) == null &&
      teamMatchesTournamentGender(row.teamGender, tournament.gender),
  }));

  return {
    canManage,
    canCheckIn,
    waiverEnabled,
    waiverRequiredBeforeCheckIn: waiverSettings.requiredBeforeCheckIn,
    paymentEnabled,
    divisions: divisionOptions,
    registrations: rows.map((row) => {
      const waiver = waiverSummary.get(row.teamId);
      const payment = paymentSummary.get(row.id);
      return {
        id: row.id,
        status: row.status as TournamentHostRegistrationsContract["registrations"][number]["status"],
        registeredAt: row.registeredAt.toISOString(),
        teamId: row.teamId,
        teamSlug: row.teamSlug,
        teamName: row.teamName,
        schoolName: row.schoolName,
        divisionId: row.divisionId,
        divisionName: row.divisionName,
        waiver: waiver
          ? {
              complete: waiver.complete,
              completedCount: waiver.completedCount,
              totalCount: waiver.totalCount,
              blocksCheckIn: waiverBlocksCheckIn(waiverSettings, waiver),
            }
          : null,
        payment: payment
          ? {
              status: payment.status,
              amountCents: payment.amountCents,
              blocksConfirm: paymentBlocksConfirm(paymentSettings, payment),
            }
          : null,
      };
    }),
    waitlist,
  };
}

async function registrationsResult(
  slug: string,
  user: AppUser
): Promise<TournamentHostRegistrationsResultContract> {
  const tournament = await requireHostTournament(slug, user);
  return {
    success: true,
    registrations: await buildRegistrationsContract(tournament, user),
  };
}

export async function loadTournamentHostRegistrations(
  slug: string,
  user: AppUser
): Promise<TournamentHostRegistrationsResultContract> {
  return registrationsResult(slug, user);
}

async function requireRegistrationForHost(
  slug: string,
  user: AppUser,
  registrationId: string
) {
  const tournament = await requireHostTournament(slug, user);
  const [reg] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.id, registrationId),
        eq(registrations.tournamentId, tournament.id)
      )
    )
    .limit(1);
  if (!reg) throw notFound("Registration not found.");
  return { tournament, reg };
}

export async function updateTournamentHostRegistrationStatus(
  slug: string,
  user: AppUser,
  registrationId: string,
  status: "confirmed" | "pending" | "checked_in"
): Promise<TournamentHostRegistrationsResultContract> {
  const { tournament, reg } = await requireRegistrationForHost(
    slug,
    user,
    registrationId
  );

  if (status === "checked_in") {
    if (!(await canCheckInRegistrations(tournament, user))) {
      throw badRequest(
        "Teams can only be checked in while the tournament is in progress."
      );
    }
    const waiverSettings = waiverSettingsFromTournament(tournament);
    const compliance = await getTeamsWaiverSummary(tournament, [reg.teamId]);
    const teamCompliance = compliance.get(reg.teamId);
    if (
      teamCompliance &&
      waiverBlocksCheckIn(waiverSettings, teamCompliance)
    ) {
      throw badRequest(
        `Waiver incomplete (${teamCompliance.completedCount}/${teamCompliance.totalCount}). Complete waivers or waive players before check-in.`
      );
    }
  } else if (status === "confirmed" && reg.status === "checked_in") {
    if (!(await canCheckInRegistrations(tournament, user))) {
      throw badRequest(
        "Check-in can only be undone while the tournament is in progress."
      );
    }
  } else if (!(await canEditRegistrations(tournament, user))) {
    throw badRequest("Registrations cannot be updated in the current tournament stage.");
  }

  if (status === "confirmed" && reg.status === "pending") {
    const paymentSettings = paymentSettingsFromTournament(tournament);
    const payments = await getPaymentsByRegistrationIds([registrationId]);
    const payment = payments.get(registrationId);
    if (paymentBlocksConfirm(paymentSettings, payment)) {
      const label =
        payment?.status === "submitted"
          ? "Payment submitted — confirm or waive before approving registration."
          : "Payment required before confirming this registration.";
      throw badRequest(label);
    }
  }

  if (reg.status !== status) {
    await db
      .update(registrations)
      .set({ status })
      .where(eq(registrations.id, registrationId));

    if (reg.divisionId) {
      await syncDivisionAutoPoolMembers(tournament.id, reg.divisionId);
    }

    try {
      await notifyTeamCaptainsOfRegistrationUpdate({
        teamIds: [reg.teamId],
        tournamentId: tournament.id,
        tournamentSlug: tournament.slug,
        tournamentName: tournament.name,
        status,
      });
    } catch {
      // Best-effort notification.
    }
  }

  return registrationsResult(slug, user);
}

export async function setTournamentHostRegistrationDivision(
  slug: string,
  user: AppUser,
  registrationId: string,
  divisionId: string | null
): Promise<TournamentHostRegistrationsResultContract> {
  const { tournament, reg } = await requireRegistrationForHost(
    slug,
    user,
    registrationId
  );

  if (!(await canEditRegistrations(tournament, user))) {
    throw badRequest(
      "Pool assignments cannot be changed in the current tournament stage."
    );
  }

  if (divisionId) {
    const [div] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, divisionId))
      .limit(1);
    if (!div || div.tournamentId !== tournament.id) {
      throw badRequest("Invalid pool for this tournament.");
    }
  }

  const previousDivisionId = reg.divisionId;
  await db
    .update(registrations)
    .set({ divisionId })
    .where(eq(registrations.id, registrationId));

  await syncManyDivisionPools(tournament.id, [previousDivisionId, divisionId]);

  return registrationsResult(slug, user);
}

export async function confirmTournamentHostRegistrations(
  slug: string,
  user: AppUser,
  registrationIds: string[]
): Promise<TournamentHostBulkMutationResultContract> {
  const tournament = await requireHostTournament(slug, user);
  const uniqueIds = [...new Set(registrationIds)];
  if (uniqueIds.length === 0) {
    throw badRequest("No registrations selected.");
  }

  if (!(await canEditRegistrations(tournament, user))) {
    throw badRequest("Registrations cannot be updated in the current tournament stage.");
  }

  const rows = await db
    .select({
      id: registrations.id,
      divisionId: registrations.divisionId,
      teamId: registrations.teamId,
    })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.id, uniqueIds),
        eq(registrations.status, "pending")
      )
    );

  if (rows.length !== uniqueIds.length) {
    throw badRequest("Some registrations are missing or no longer pending.");
  }

  const paymentSettings = paymentSettingsFromTournament(tournament);
  if (paymentSettings.enabled && paymentSettings.requiredBeforeConfirm) {
    const payments = await getPaymentsByRegistrationIds(uniqueIds);
    const blocked = uniqueIds.filter((id) =>
      paymentBlocksConfirm(paymentSettings, payments.get(id))
    );
    if (blocked.length > 0) {
      throw badRequest(
        `Payment required before confirming ${blocked.length} registration${blocked.length === 1 ? "" : "s"}.`
      );
    }
  }

  await db
    .update(registrations)
    .set({ status: "confirmed" })
    .where(inArray(registrations.id, uniqueIds));

  await syncManyDivisionPools(
    tournament.id,
    rows.map((row) => row.divisionId)
  );

  try {
    await notifyTeamCaptainsOfRegistrationUpdate({
      teamIds: rows.map((row) => row.teamId),
      tournamentId: tournament.id,
      tournamentSlug: tournament.slug,
      tournamentName: tournament.name,
      status: "confirmed",
    });
  } catch {
    // Best-effort notification.
  }

  return {
    success: true,
    count: rows.length,
    registrations: await buildRegistrationsContract(tournament, user),
  };
}

export async function checkInTournamentHostRegistrations(
  slug: string,
  user: AppUser,
  registrationIds: string[]
): Promise<TournamentHostBulkMutationResultContract> {
  const tournament = await requireHostTournament(slug, user);
  const uniqueIds = [...new Set(registrationIds)];
  if (uniqueIds.length === 0) {
    throw badRequest("No registrations selected.");
  }

  if (!(await canCheckInRegistrations(tournament, user))) {
    throw badRequest(
      "Teams can only be checked in while the tournament is in progress."
    );
  }

  const rows = await db
    .select({
      id: registrations.id,
      teamId: registrations.teamId,
    })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.id, uniqueIds),
        eq(registrations.status, "confirmed")
      )
    );

  if (rows.length !== uniqueIds.length) {
    throw badRequest(
      "Some registrations are missing or already checked in."
    );
  }

  const waiverSettings = waiverSettingsFromTournament(tournament);
  const compliance = await getTeamsWaiverSummary(
    tournament,
    rows.map((row) => row.teamId)
  );
  const blocked = rows.filter((row) => {
    const teamCompliance = compliance.get(row.teamId);
    return (
      teamCompliance &&
      waiverBlocksCheckIn(waiverSettings, teamCompliance)
    );
  });
  if (blocked.length > 0) {
    throw badRequest(
      `Waiver incomplete for ${blocked.length} team${blocked.length === 1 ? "" : "s"}. Complete waivers first.`
    );
  }

  await db
    .update(registrations)
    .set({ status: "checked_in" })
    .where(inArray(registrations.id, uniqueIds));

  try {
    await notifyTeamCaptainsOfRegistrationUpdate({
      teamIds: rows.map((row) => row.teamId),
      tournamentId: tournament.id,
      tournamentSlug: tournament.slug,
      tournamentName: tournament.name,
      status: "checked_in",
    });
  } catch {
    // Best-effort notification.
  }

  return {
    success: true,
    count: rows.length,
    registrations: await buildRegistrationsContract(tournament, user),
  };
}

export async function bulkAssignTournamentHostRegistrations(
  slug: string,
  user: AppUser,
  registrationIds: string[],
  divisionId: string | null
): Promise<TournamentHostBulkMutationResultContract> {
  const tournament = await requireHostTournament(slug, user);
  const uniqueIds = [...new Set(registrationIds)];
  if (uniqueIds.length === 0) {
    throw badRequest("No teams selected.");
  }

  if (!(await canEditRegistrations(tournament, user))) {
    throw badRequest(
      "Pool assignments cannot be changed in the current tournament stage."
    );
  }

  if (divisionId) {
    const [div] = await db
      .select({ id: divisions.id, tournamentId: divisions.tournamentId })
      .from(divisions)
      .where(eq(divisions.id, divisionId))
      .limit(1);
    if (!div || div.tournamentId !== tournament.id) {
      throw badRequest("Invalid pool for this tournament.");
    }
  }

  const rows = await db
    .select({ id: registrations.id, divisionId: registrations.divisionId })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.id, uniqueIds)
      )
    );
  if (rows.length !== uniqueIds.length) {
    throw badRequest("Some registrations no longer exist.");
  }

  await db
    .update(registrations)
    .set({ divisionId })
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        inArray(registrations.id, uniqueIds)
      )
    );

  await syncManyDivisionPools(tournament.id, [
    divisionId,
    ...rows.map((row) => row.divisionId),
  ]);

  return {
    success: true,
    count: rows.length,
    registrations: await buildRegistrationsContract(tournament, user),
  };
}

export async function removeTournamentHostRegistrations(
  slug: string,
  user: AppUser,
  registrationIds: string[]
): Promise<TournamentHostBulkMutationResultContract> {
  const tournament = await requireHostTournament(slug, user);
  const uniqueIds = [...new Set(registrationIds)];
  if (uniqueIds.length === 0) {
    throw badRequest("No teams selected.");
  }

  if (!(await canEditRegistrations(tournament, user))) {
    throw badRequest("Teams cannot be removed in the current tournament stage.");
  }

  let count: number;
  try {
    const result = await removeRegistrationsAtomically({
      tournamentId: tournament.id,
      registrationIds: uniqueIds,
      actorUserId: user.id,
    });
    count = result.count;
  } catch (error) {
    throw badRequest(competitionOperationError(error));
  }

  await invalidatePublicTournamentCachesByIds([tournament.id], {
    listing: true,
  });

  return {
    success: true,
    count,
    registrations: await buildRegistrationsContract(tournament, user),
  };
}

export async function promoteTournamentHostWaitlist(
  slug: string,
  user: AppUser,
  operationId: string
): Promise<TournamentHostWaitlistPromoteResultContract> {
  const tournament = await requireHostTournament(slug, user);
  if (!(await canEditRegistrations(tournament, user))) {
    throw badRequest("Waitlist cannot be updated in the current tournament stage.");
  }

  try {
    const result = await promoteNextWaitlistedTeamAtomically({
      tournamentId: tournament.id,
      actorUserId: user.id,
      operationId,
    });
    await invalidatePublicTournamentCachesByIds([tournament.id], {
      listing: true,
    });
    return {
      success: true,
      teamId: result.teamId,
      registrations: await buildRegistrationsContract(tournament, user),
    };
  } catch (error) {
    const message = waitlistDomainError(error);
    if (message) throw badRequest(message);
    throw badRequest("Waitlist promotion failed.");
  }
}

export async function removeTournamentHostWaitlistEntry(
  slug: string,
  user: AppUser,
  waitlistEntryId: string
): Promise<TournamentHostRegistrationsResultContract> {
  const tournament = await requireHostTournament(slug, user);
  if (!(await canEditRegistrations(tournament, user))) {
    throw badRequest("Waitlist cannot be updated in the current tournament stage.");
  }

  try {
    await removeWaitlistEntryAtomically({
      tournamentId: tournament.id,
      waitlistEntryId,
      actorUserId: user.id,
    });
    await invalidatePublicTournamentCachesByIds([tournament.id], {
      listing: true,
    });
  } catch (error) {
    const message = waitlistDomainError(error);
    if (message) throw badRequest(message);
    throw badRequest("Could not remove waitlist entry.");
  }

  return registrationsResult(slug, user);
}
