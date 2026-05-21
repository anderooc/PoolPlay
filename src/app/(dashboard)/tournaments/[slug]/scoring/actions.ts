"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { matches, sets, tournaments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { updateScoreSchema } from "@/lib/validators";
import { canScoreMatches } from "@/lib/tournaments/permissions";
import { getMatchTournamentId } from "@/lib/tournaments/match-query";

async function assertCanScoreMatch(matchId: string) {
  const user = await requireUser();
  const tournamentId = await getMatchTournamentId(matchId);

  if (!tournamentId) {
    return { error: "Match not found" as const, user: null, tournament: null };
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || !canScoreMatches(tournament, user)) {
    return {
      error: "Only the organizer can score matches while the event is in progress." as const,
      user: null,
      tournament: null,
    };
  }

  return { error: null, user, tournament };
}

export async function updateScore(formData: FormData) {
  const parsed = updateScoreSchema.safeParse({
    matchId: formData.get("matchId"),
    setNumber: parseInt(formData.get("setNumber") as string, 10),
    teamAScore: parseInt(formData.get("teamAScore") as string, 10),
    teamBScore: parseInt(formData.get("teamBScore") as string, 10),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { matchId, setNumber, teamAScore, teamBScore } = parsed.data;

  const gate = await assertCanScoreMatch(matchId);
  if (gate.error) return { error: gate.error };

  const [existing] = await db
    .select()
    .from(sets)
    .where(and(eq(sets.matchId, matchId), eq(sets.setNumber, setNumber)))
    .limit(1);

  if (existing) {
    await db
      .update(sets)
      .set({ teamAScore, teamBScore })
      .where(eq(sets.id, existing.id));
  } else {
    await db.insert(sets).values({
      matchId,
      setNumber,
      teamAScore,
      teamBScore,
    });
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (match && match.status === "upcoming") {
    await db
      .update(matches)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(matches.id, matchId));
  }

  revalidatePath(`/tournaments/[slug]/scoring`, "page");
  return { success: true };
}

export async function finalizeMatch(matchId: string, winnerId: string) {
  const gate = await assertCanScoreMatch(matchId);
  if (gate.error) return { error: gate.error };

  await db
    .update(matches)
    .set({
      status: "completed",
      winnerId,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  revalidatePath(`/tournaments/[slug]/scoring`, "page");
  return { success: true };
}

export async function startMatch(matchId: string) {
  const gate = await assertCanScoreMatch(matchId);
  if (gate.error) return { error: gate.error };

  await db
    .update(matches)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  revalidatePath(`/tournaments/[slug]/scoring`, "page");
  return { success: true };
}
