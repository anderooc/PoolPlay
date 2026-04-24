"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  matches,
  courts,
  courtDivisions,
  tournaments,
  pools,
  brackets,
  divisions,
} from "@/lib/db/schema";
import { eq, and, isNull, or, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireUser } from "@/lib/auth";
import { autoScheduleMatchesWithCourtSets } from "@/lib/utils/scheduling";

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
    .where(eq(courts.tournamentId, tournamentId))
    .orderBy(asc(courts.name), asc(courts.id));

  if (tournamentCourts.length === 0) {
    return { error: "Add courts before scheduling" };
  }

  const courtDivisionLinks = await db
    .select({
      courtId: courtDivisions.courtId,
      divisionId: courtDivisions.divisionId,
    })
    .from(courtDivisions)
    .innerJoin(courts, eq(courtDivisions.courtId, courts.id))
    .where(eq(courts.tournamentId, tournamentId));

  const divisionIdsByCourt = new Map<string, Set<string>>();
  for (const row of courtDivisionLinks) {
    let set = divisionIdsByCourt.get(row.courtId);
    if (!set) {
      set = new Set();
      divisionIdsByCourt.set(row.courtId, set);
    }
    set.add(row.divisionId);
  }

  const divFromPool = alias(divisions, "schedule_div_pool");
  const divFromBracket = alias(divisions, "schedule_div_bracket");

  const unscheduledMatches = await db
    .select({
      id: matches.id,
      poolDivisionId: divFromPool.id,
      bracketDivisionId: divFromBracket.id,
    })
    .from(matches)
    .leftJoin(pools, eq(matches.poolId, pools.id))
    .leftJoin(divFromPool, eq(pools.divisionId, divFromPool.id))
    .leftJoin(brackets, eq(matches.bracketId, brackets.id))
    .leftJoin(divFromBracket, eq(brackets.divisionId, divFromBracket.id))
    .where(
      and(
        eq(matches.status, "upcoming"),
        isNull(matches.scheduledTime),
        or(
          eq(divFromPool.tournamentId, tournamentId),
          eq(divFromBracket.tournamentId, tournamentId)
        )
      )
    );

  if (unscheduledMatches.length === 0) {
    return { error: "No unscheduled matches found" };
  }

  const startTime = new Date(startTimeISO);
  const allCourtIds = tournamentCourts.map((c) => c.id);

  const items = unscheduledMatches.map((row) => {
    const divisionId = row.poolDivisionId ?? row.bracketDivisionId;
    let allowed = tournamentCourts
      .filter((c) => {
        const linked = divisionIdsByCourt.get(c.id);
        if (!linked || linked.size === 0) {
          return true;
        }
        return divisionId != null && linked.has(divisionId);
      })
      .map((c) => c.id);
    if (allowed.length === 0) {
      allowed = allCourtIds;
    }
    return { matchId: row.id, courtIds: allowed };
  });

  const schedule = autoScheduleMatchesWithCourtSets(
    items,
    startTime,
    matchDuration
  );

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

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/schedule");
  return { success: true, scheduled: schedule.length };
}

export async function updateMatchSchedule(
  matchId: string,
  courtId: string,
  scheduledTime: string
) {
  await requireUser();

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
