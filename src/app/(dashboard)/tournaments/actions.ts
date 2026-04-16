"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  tournaments,
  divisions,
  courts,
  users,
  registrations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { createTournamentSchema, createDivisionSchema } from "@/lib/validators";
import { checkContentFilter } from "@/lib/utils/content-filter";
import type { TournamentStatus } from "@/types";

export async function createTournament(formData: FormData) {
  const user = await requireUser();

  const parsed = createTournamentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    location: formData.get("location"),
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const contentError = checkContentFilter(
    parsed.data.name,
    parsed.data.description,
    parsed.data.location,
    parsed.data.address
  );
  if (contentError) return { error: contentError };

  const [tournament] = await db
    .insert(tournaments)
    .values({
      organizerId: user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      location: parsed.data.location,
      address: parsed.data.address || null,
      status: "draft",
    })
    .returning();

  if (user.role !== "organizer") {
    await db
      .update(users)
      .set({ role: "organizer" })
      .where(eq(users.id, user.id));
  }

  redirect(`/tournaments/${tournament.id}`);
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: TournamentStatus
) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can update tournament status" };
  }

  const validTransitions: Record<TournamentStatus, TournamentStatus[]> = {
    draft: ["registration_open"],
    registration_open: ["registration_closed"],
    registration_closed: ["in_progress"],
    in_progress: ["completed"],
    completed: [],
  };

  if (!validTransitions[tournament.status as TournamentStatus].includes(status)) {
    return { error: `Cannot transition from ${tournament.status} to ${status}` };
  }

  await db
    .update(tournaments)
    .set({ status, updatedAt: new Date() })
    .where(eq(tournaments.id, tournamentId));

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function addDivision(tournamentId: string, formData: FormData) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can add divisions" };
  }

  const parsed = createDivisionSchema.safeParse({
    name: formData.get("name"),
    format: formData.get("format"),
    teamCap: formData.get("teamCap")
      ? parseInt(formData.get("teamCap") as string, 10)
      : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const divContentError = checkContentFilter(parsed.data.name);
  if (divContentError) return { error: divContentError };

  const normalizedDivisionName = parsed.data.name.trim().toLowerCase();
  const existingDivisions = await db
    .select({ name: divisions.name })
    .from(divisions)
    .where(eq(divisions.tournamentId, tournamentId));

  const duplicateDivision = existingDivisions.some(
    (div) => div.name.trim().toLowerCase() === normalizedDivisionName
  );
  if (duplicateDivision) {
    return { error: "A pool/division with this name already exists" };
  }

  await db.insert(divisions).values({
    tournamentId,
    name: parsed.data.name.trim(),
    format: parsed.data.format,
    teamCap: parsed.data.teamCap ?? null,
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function removeDivision(tournamentId: string, divisionId: string) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can remove divisions" };
  }

  await db.delete(divisions).where(eq(divisions.id, divisionId));

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function addCourt(tournamentId: string, formData: FormData) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can add courts" };
  }

  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) return { error: "Court name is required" };

  const courtContentError = checkContentFilter(name);
  if (courtContentError) return { error: courtContentError };

  const existingCourts = await db
    .select({ name: courts.name })
    .from(courts)
    .where(eq(courts.tournamentId, tournamentId));

  const duplicateCourt = existingCourts.some(
    (court) => court.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (duplicateCourt) {
    return { error: "A court with this name already exists" };
  }

  await db.insert(courts).values({ tournamentId, name });

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function removeCourt(tournamentId: string, courtId: string) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can remove courts" };
  }

  await db.delete(courts).where(eq(courts.id, courtId));

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: "confirmed" | "pending"
) {
  const user = await requireUser();

  const [reg] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!reg) return { error: "Registration not found" };

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, reg.tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can update registrations" };
  }

  await db
    .update(registrations)
    .set({ status })
    .where(eq(registrations.id, registrationId));

  revalidatePath(`/tournaments/${tournament.id}`);
  return { success: true };
}
