"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { registrations, teamMembers, divisions } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function registerTeam(
  tournamentId: string,
  teamId: string,
  divisionId: string
) {
  const user = await requireUser();

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
    );

  if (!membership || membership.role !== "captain") {
    return { error: "Only team captains can register for tournaments" };
  }

  const [existing] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.teamId, teamId),
        eq(registrations.tournamentId, tournamentId)
      )
    );

  if (existing) {
    return { error: "This team is already registered for this tournament" };
  }

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);

  if (!division) {
    return { error: "Division not found" };
  }

  if (division.teamCap) {
    const [{ value: regCount }] = await db
      .select({ value: count() })
      .from(registrations)
      .where(eq(registrations.divisionId, divisionId));

    if (regCount >= division.teamCap) {
      return { error: "This division is full" };
    }
  }

  await db.insert(registrations).values({
    teamId,
    tournamentId,
    divisionId,
    status: "pending",
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}
