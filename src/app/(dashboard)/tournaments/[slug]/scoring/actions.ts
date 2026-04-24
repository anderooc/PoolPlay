"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { matches, sets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { updateScoreSchema } from "@/lib/validators";

export async function updateScore(formData: FormData) {
  await requireUser();

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

  // Update match status to in_progress if it's upcoming
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

  revalidatePath(`/tournaments`);
  return { success: true };
}

export async function finalizeMatch(matchId: string, winnerId: string) {
  await requireUser();

  await db
    .update(matches)
    .set({
      status: "completed",
      winnerId,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  revalidatePath(`/tournaments`);
  return { success: true };
}

export async function startMatch(matchId: string) {
  await requireUser();

  await db
    .update(matches)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  revalidatePath(`/tournaments`);
  return { success: true };
}
