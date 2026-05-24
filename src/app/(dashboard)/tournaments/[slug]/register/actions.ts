"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  registrations,
  teamMembers,
  tournaments,
  teams,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import {
  canRegisterTeams,
  canWithdrawRegistration,
  isTournamentOrganizer,
  registrationGenderMismatchMessage,
  teamMatchesTournamentGender,
} from "@/lib/tournaments/permissions";

import {
  getFirstDivisionId,
  insertTeamRegistration,
} from "@/lib/tournaments/registrations";

type TournamentRow = typeof tournaments.$inferSelect;

async function validateTeamRegistration(
  user: Awaited<ReturnType<typeof requireUser>>,
  tournament: TournamentRow,
  teamId: string,
  isHost: boolean
): Promise<{ error: string } | { ok: true }> {
  const [team] = await db
    .select({ id: teams.id, gender: teams.gender })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return { error: "Team not found" };
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

  const isHost = isTournamentOrganizer(tournament, user);

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
      await insertTeamRegistration(
        tournamentId,
        teamId,
        isHost ? "confirmed" : "pending",
        firstDivisionId
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

  const isHost = isTournamentOrganizer(tournament, user);

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

  await db.delete(registrations).where(eq(registrations.id, reg.id));

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/register", "page");
  return { success: true };
}
