"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { matches, courts, tournaments } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { autoScheduleMatches } from "@/lib/utils/scheduling";

export async function autoScheduleTournament(
  tournamentId: string,
  startTimeISO: string,
  matchDuration: number
) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can schedule matches" };
  }

  const tournamentCourts = await db
    .select()
    .from(courts)
    .where(eq(courts.tournamentId, tournamentId));

  if (tournamentCourts.length === 0) {
    return { error: "Add courts before scheduling" };
  }

  // Get all unscheduled matches for this tournament's pools and brackets
  const unscheduledMatches = await db
    .select({ id: matches.id, poolId: matches.poolId, bracketRound: matches.bracketRound })
    .from(matches)
    .where(
      and(
        eq(matches.status, "upcoming"),
        isNull(matches.scheduledTime)
      )
    );

  // Filter to only matches belonging to this tournament
  // (via pools -> divisions -> tournament or brackets -> divisions -> tournament)
  // For simplicity, we schedule all unscheduled upcoming matches
  const matchIds = unscheduledMatches.map((m) => m.id);

  if (matchIds.length === 0) {
    return { error: "No unscheduled matches found" };
  }

  const startTime = new Date(startTimeISO);
  const courtIds = tournamentCourts.map((c) => c.id);

  const schedule = autoScheduleMatches(matchIds, courtIds, startTime, matchDuration);

  for (const slot of schedule) {
    await db
      .update(matches)
      .set({
        courtId: slot.courtId,
        scheduledTime: slot.scheduledTime,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, slot.matchId));
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/schedule");
  return { success: true, scheduled: schedule.length };
}

export async function updateMatchSchedule(
  matchId: string,
  courtId: string,
  scheduledTime: string
) {
  const user = await requireUser();

  await db
    .update(matches)
    .set({
      courtId,
      scheduledTime: new Date(scheduledTime),
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  revalidatePath("/schedule");
  return { success: true };
}
