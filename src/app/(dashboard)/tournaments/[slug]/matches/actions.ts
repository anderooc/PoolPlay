"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  matches,
  pools,
  sets,
  teamMembers,
  tournaments,
} from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { updateScoreSchema } from "@/lib/validators";
import {
  canRefereeMatch,
  isTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import { getMatchTournamentId } from "@/lib/tournaments/match-query";
import { tryFillBracketFromPoolPlay, advanceBracketWinner, assignBracketRefsForBracket } from "@/lib/tournaments/bracket-structure";
import {
  tryCompleteTournamentWhenBracketsDone,
  revertTournamentIfBracketsIncomplete,
} from "@/lib/tournaments/tournament-completion";
import {
  evaluateMatchOutcome,
  isSetComplete,
  targetForSet,
} from "@/lib/tournaments/match-format";
import { isTournamentArchived } from "@/lib/tournament-status";

type MatchRow = typeof matches.$inferSelect;
type TournamentRow = typeof tournaments.$inferSelect;

interface ControlGate {
  error: string | null;
  user: { id: string; role: string } | null;
  tournament: TournamentRow | null;
  match: MatchRow | null;
  isOrganizer: boolean;
}

async function loadUserTeamIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));
  return new Set(rows.map((r) => r.teamId));
}

/**
 * Authorizes the current user to run a match's lifecycle/scoring. The host has
 * full control; otherwise the user must be a member of the assigned ref team
 * while the tournament is in progress.
 */
async function assertCanControlMatch(matchId: string): Promise<ControlGate> {
  const fail = (error: string): ControlGate => ({
    error,
    user: null,
    tournament: null,
    match: null,
    isOrganizer: false,
  });

  const user = await requireUser();

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return fail("Match not found");

  const tournamentId = await getMatchTournamentId(matchId);
  if (!tournamentId) return fail("Match not found");

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament) return fail("Tournament not found");

  const userTeamIds = await loadUserTeamIds(user.id);
  const isOrganizer = isTournamentOrganizer(tournament, user);

  if (!canRefereeMatch(tournament, user, match, userTeamIds)) {
    return fail(
      "Only the assigned ref team or the host can run this match while the tournament is in progress."
    );
  }

  return { error: null, user, tournament, match, isOrganizer };
}

export async function startWarmup(matchId: string) {
  const gate = await assertCanControlMatch(matchId);
  if (gate.error || !gate.match) return { error: gate.error };

  if (gate.match.status !== "upcoming") {
    return { error: "Warmup can only start before the match begins." };
  }

  await db
    .update(matches)
    .set({ warmupStartedAt: new Date(), updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  revalidatePath(`/tournaments/[slug]/matches/[matchSlug]`, "page");
  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

export async function startMatch(matchId: string) {
  const gate = await assertCanControlMatch(matchId);
  if (gate.error || !gate.match) return { error: gate.error };

  if (gate.match.status === "completed") {
    return { error: "This match is already completed." };
  }

  const now = new Date();
  await db
    .update(matches)
    .set({
      status: "in_progress",
      startedAt: gate.match.startedAt ?? now,
      warmupStartedAt: gate.match.warmupStartedAt ?? now,
      updatedAt: now,
    })
    .where(eq(matches.id, matchId));

  revalidatePath(`/tournaments/[slug]/matches/[matchSlug]`, "page");
  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

/**
 * Take a live match out of in-progress. Scores and `startedAt` are kept so the
 * ref can resume later; status returns to `upcoming` and warmup is cleared.
 */
export async function pauseMatch(matchId: string) {
  const gate = await assertCanControlMatch(matchId);
  if (gate.error || !gate.match) return { error: gate.error };

  if (gate.match.status !== "in_progress") {
    return { error: "Only an in-progress match can be paused." };
  }

  await db
    .update(matches)
    .set({
      status: "upcoming",
      warmupStartedAt: null,
      // Preserve startedAt so the console treats this as paused, not fresh.
      startedAt: gate.match.startedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId));

  revalidatePath(`/tournaments/[slug]/matches/[matchSlug]`, "page");
  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

/**
 * Save absolute scores for a single set. The client scorekeeper debounces +1/-1
 * taps and sends the resulting totals here. Auto-finalizes the match when the
 * format says enough sets have been played.
 */
export async function saveSetScore(formData: FormData) {
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

  const gate = await assertCanControlMatch(matchId);
  if (gate.error || !gate.match || !gate.tournament) {
    return { error: gate.error };
  }

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
    await db.insert(sets).values({ matchId, setNumber, teamAScore, teamBScore });
  }

  // First score entry promotes an upcoming/warmup match to in progress.
  if (gate.match.status !== "in_progress" && gate.match.status !== "completed") {
    const now = new Date();
    await db
      .update(matches)
      .set({
        status: "in_progress",
        startedAt: gate.match.startedAt ?? now,
        warmupStartedAt: gate.match.warmupStartedAt ?? now,
        updatedAt: now,
      })
      .where(eq(matches.id, matchId));
  }

  if (gate.match.teamAId && gate.match.teamBId) {
    const allSets = await db
      .select({ teamAScore: sets.teamAScore, teamBScore: sets.teamBScore })
      .from(sets)
      .where(eq(sets.matchId, matchId))
      .orderBy(asc(sets.setNumber));

    // Only fully-finished sets (target reached, win by two) count toward
    // finalizing — running scores from the live scorekeeper must not trip an
    // early finish.
    const formatSettings = {
      format: gate.tournament.matchFormat,
      targetScore: gate.tournament.setTargetScore,
      tiebreakTargetScore: gate.tournament.tiebreakTargetScore,
    };
    const completedSets = allSets.filter((s, i) =>
      isSetComplete(s.teamAScore, s.teamBScore, targetForSet(formatSettings, i + 1))
    );

    const outcome = evaluateMatchOutcome(
      { format: gate.tournament.matchFormat },
      gate.match.teamAId,
      gate.match.teamBId,
      completedSets
    );

    if (outcome.shouldFinalize) {
      await db
        .update(matches)
        .set({
          status: "completed",
          winnerId: outcome.winnerId,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId));

      await advanceBracketWinner(matchId);

      const [poolRow] = gate.match.poolId
        ? await db
            .select({ divisionId: pools.divisionId })
            .from(pools)
            .where(eq(pools.id, gate.match.poolId))
            .limit(1)
        : [];
      if (poolRow?.divisionId) {
        await tryFillBracketFromPoolPlay(poolRow.divisionId);
      }

      await tryCompleteTournamentWhenBracketsDone(gate.tournament.id);
    }
  }

  revalidatePath(`/tournaments/[slug]/matches/[matchSlug]`, "page");
  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

export async function finalizeMatch(matchId: string, winnerId: string | null) {
  const gate = await assertCanControlMatch(matchId);
  if (gate.error || !gate.match) return { error: gate.error };

  const [row] = await db
    .select({ poolId: matches.poolId, divisionId: pools.divisionId })
    .from(matches)
    .leftJoin(pools, eq(matches.poolId, pools.id))
    .where(eq(matches.id, matchId))
    .limit(1);

  await db
    .update(matches)
    .set({ status: "completed", winnerId, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  await advanceBracketWinner(matchId);

  if (row?.divisionId) {
    await tryFillBracketFromPoolPlay(row.divisionId);
  }

  if (gate.tournament) {
    await tryCompleteTournamentWhenBracketsDone(gate.tournament.id);
  }

  revalidatePath(`/tournaments/[slug]/matches/[matchSlug]`, "page");
  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

/** Host-only: reopen a completed match for corrections. */
export async function reopenMatch(matchId: string) {
  const gate = await assertCanControlMatch(matchId);
  if (gate.error || !gate.match) return { error: gate.error };
  if (!gate.isOrganizer) {
    return { error: "Only the host can reopen a completed match." };
  }

  await db
    .update(matches)
    .set({ status: "in_progress", winnerId: null, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  if (gate.tournament) {
    await revertTournamentIfBracketsIncomplete(gate.tournament.id);
  }

  revalidatePath(`/tournaments/[slug]/matches/[matchSlug]`, "page");
  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}

/** Host-only: edit a match's planned start time from the match/pool/bracket UI. */
export async function updateMatchScheduledTime(
  matchId: string,
  isoTime: string | null
) {
  const user = await requireUser();
  const tournamentId = await getMatchTournamentId(matchId);
  if (!tournamentId) return { error: "Match not found" };

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || !isTournamentOrganizer(tournament, user)) {
    return { error: "Only the host can edit the start time." };
  }
  if (isTournamentArchived(tournament.date)) {
    return { error: "This tournament is archived." };
  }

  let scheduledTime: Date | null = null;
  if (isoTime) {
    const parsed = new Date(isoTime);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Enter a valid start time." };
    }
    scheduledTime = parsed;
  }

  const [match] = await db
    .select({ bracketId: matches.bracketId, courtId: matches.courtId })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  await db
    .update(matches)
    .set({ scheduledTime, updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  if (match?.bracketId) {
    await assignBracketRefsForBracket(match.bracketId, db, {
      resetRoundOneCourtId: match.courtId,
    });
  }

  revalidatePath(`/tournaments/[slug]/matches/[matchSlug]`, "page");
  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const };
}
