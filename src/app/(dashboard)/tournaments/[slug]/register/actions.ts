"use server";

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

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  registrations,
  teamMembers,
  tournaments,
  teams,
  schools,
} from "@/lib/db/schema";
import { eq, and, notInArray, asc } from "drizzle-orm";
import {
  isSchoolVerifiedForTournament,
  SCHOOL_NOT_VERIFIED_FOR_TOURNAMENT_ERROR,
  teamRegistrationBlockReason,
} from "@/lib/tournaments/registration-eligibility";
import { requireUser } from "@/lib/auth";
import {
  canRegisterTeams,
  canWithdrawRegistration,
  resolveIsTournamentOrganizer,
  registrationGenderMismatchMessage,
  teamMatchesTournamentGender,
} from "@/lib/tournaments/permissions";
import { syncDivisionAutoPoolMembers } from "@/lib/tournaments/division-pools";

import {
  getFirstDivisionId,
  insertTeamRegistration,
} from "@/lib/tournaments/registrations";
import { createRegistrationPayment } from "@/lib/tournaments/payment-compliance";

type TournamentRow = typeof tournaments.$inferSelect;

async function validateTeamRegistration(
  user: Awaited<ReturnType<typeof requireUser>>,
  tournament: TournamentRow,
  teamId: string,
  isHost: boolean
): Promise<{ error: string } | { ok: true }> {
  const [team] = await db
    .select({
      id: teams.id,
      gender: teams.gender,
      schoolId: teams.schoolId,
      schoolVerificationStatus: schools.verificationStatus,
      teamVerificationStatus: teams.verificationStatus,
    })
    .from(teams)
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return { error: "Team not found" };
  }

  const registrationBlock = teamRegistrationBlockReason(
    team.schoolId,
    team.schoolVerificationStatus,
    team.teamVerificationStatus
  );
  if (registrationBlock) {
    return { error: registrationBlock };
  }

  if (!teamMatchesTournamentGender(team.gender, tournament.gender)) {
    return { error: registrationGenderMismatchMessage(tournament.gender) };
  }

  if (!isHost) {
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
      );

    if (!membership || membership.role !== "captain") {
      return {
        error:
          "Only team captains or the tournament host can register teams for this event",
      };
    }
  }

  const [existing] = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(
        eq(registrations.teamId, teamId),
        eq(registrations.tournamentId, tournament.id)
      )
    )
    .limit(1);

  if (existing) {
    return { error: "This team is already registered for this tournament" };
  }

  return { ok: true };
}

export async function registerTeams(tournamentId: string, teamIds: string[]) {
  const user = await requireUser();
  const uniqueIds = [...new Set(teamIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { error: "Select at least one team" };
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    return { error: "Tournament not found" };
  }

  if (!canRegisterTeams(tournament)) {
    return {
      error:
        "Registration is not open for this tournament. Contact the host if you need to sign up.",
    };
  }

  const isHost = await resolveIsTournamentOrganizer(tournament, user);

  for (const teamId of uniqueIds) {
    const validation = await validateTeamRegistration(
      user,
      tournament,
      teamId,
      isHost
    );
    if ("error" in validation) {
      return { error: validation.error };
    }
  }

  const firstDivisionId = await getFirstDivisionId(tournamentId);

  try {
    for (const teamId of uniqueIds) {
      const [team] = await db
        .select({ schoolId: teams.schoolId })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      const registrationId = await insertTeamRegistration(
        tournamentId,
        teamId,
        isHost ? "confirmed" : "pending",
        firstDivisionId
      );

      await createRegistrationPayment(
        tournament,
        registrationId,
        teamId,
        team?.schoolId ?? null,
        isHost
          ? { hostWaived: true, hostUserId: user.id }
          : undefined
      );
    }
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not register teams. Try again.",
    };
  }

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/register", "page");
  return { success: true as const, count: uniqueIds.length };
}

export async function registerTeam(tournamentId: string, teamId: string) {
  const result = await registerTeams(tournamentId, [teamId]);
  if ("error" in result && result.error) {
    return { error: result.error };
  }
  return { success: true as const };
}

export async function withdrawRegistration(
  tournamentId: string,
  teamId: string
) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    return { error: "Tournament not found" };
  }

  if (!canWithdrawRegistration(tournament)) {
    return { error: "Registration can no longer be withdrawn for this event." };
  }

  const isHost = await resolveIsTournamentOrganizer(tournament, user);

  if (!isHost) {
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
      )
      .limit(1);

    if (!membership || membership.role !== "captain") {
      return {
        error: "Only team captains or the tournament host can withdraw a team",
      };
    }
  }

  const [reg] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.teamId, teamId)
      )
    )
    .limit(1);

  if (!reg) {
    return { error: "This team is not registered for this tournament" };
  }

  const removedDivisionId = reg.divisionId;

  await db.delete(registrations).where(eq(registrations.id, reg.id));

  if (removedDivisionId) {
    await syncDivisionAutoPoolMembers(tournamentId, removedDivisionId);
  }

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/register", "page");
  revalidatePath("/tournaments/[slug]/brackets", "page");
  return { success: true };
}

export type AddableTeamResult = {
  id: string;
  name: string;
  university: string;
  schoolId: string | null;
  schoolName: string | null;
};

/** Host-only: eligible teams for one school (matching gender, not yet registered). */
export async function getAddableTeamsForSchool(
  tournamentId: string,
  schoolId: string
): Promise<{ teams: AddableTeamResult[] } | { error: string }> {
  const user = await requireUser();

  const [tournament] = await db
    .select({
      id: tournaments.id,
      gender: tournaments.gender,
      organizerId: tournaments.organizerId,
      hostSchoolId: tournaments.hostSchoolId,
      status: tournaments.status,
      date: tournaments.date,
    })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    return { error: "Tournament not found" };
  }

  if (!await resolveIsTournamentOrganizer(tournament, user)) {
    return { error: "Only the tournament host can add teams" };
  }

  if (!canRegisterTeams(tournament)) {
    return { error: "Registration is not open for this tournament" };
  }

  const [school] = await db
    .select({
      id: schools.id,
      verificationStatus: schools.verificationStatus,
    })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  if (!school) {
    return { error: "School not found" };
  }

  if (!isSchoolVerifiedForTournament(school.verificationStatus)) {
    return { error: SCHOOL_NOT_VERIFIED_FOR_TOURNAMENT_ERROR };
  }

  const existingRegs = await db
    .select({ teamId: registrations.teamId })
    .from(registrations)
    .where(eq(registrations.tournamentId, tournamentId));

  const registeredIds = existingRegs.map((r) => r.teamId);

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      university: teams.university,
      schoolId: teams.schoolId,
      schoolName: schools.name,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(
      and(
        eq(teams.schoolId, schoolId),
        eq(teams.gender, tournament.gender),
        registeredIds.length > 0
          ? notInArray(teams.id, registeredIds)
          : undefined
      )
    )
    .orderBy(asc(teams.name));

  return { teams: rows };
}
