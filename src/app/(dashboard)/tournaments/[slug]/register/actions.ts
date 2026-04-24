"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  registrations,
  teamMembers,
  tournaments,
  teams,
  divisions,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

/** Postgres NOT NULL violation — DB not migrated for nullable division_id yet */
function isNotNullViolation(e: unknown): boolean {
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "23502"
  ) {
    return true;
  }
  if (typeof e === "object" && e !== null && "cause" in e) {
    return isNotNullViolation((e as { cause: unknown }).cause);
  }
  return false;
}

export async function registerTeam(tournamentId: string, teamId: string) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    return { error: "Tournament not found" };
  }

  const isHost = tournament.organizerId === user.id;

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
  } else {
    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      return { error: "Team not found" };
    }
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

  const [firstDivision] = await db
    .select({ id: divisions.id })
    .from(divisions)
    .where(eq(divisions.tournamentId, tournamentId))
    .orderBy(asc(divisions.createdAt))
    .limit(1);

  const row = {
    teamId,
    tournamentId,
    divisionId: null as string | null,
    // Host-added teams should bypass manual confirmation.
    status: isHost ? ("confirmed" as const) : ("pending" as const),
  };

  try {
    await db.insert(registrations).values(row);
  } catch (e) {
    if (isNotNullViolation(e) && firstDivision) {
      await db.insert(registrations).values({
        ...row,
        divisionId: firstDivision.id,
      });
    } else if (isNotNullViolation(e) && !firstDivision) {
      return {
        error:
          "Add at least one division to this tournament before registering teams. (Or run the DB migration so division can be unset until you assign pools.)",
      };
    } else {
      throw e;
    }
  }

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true };
}
