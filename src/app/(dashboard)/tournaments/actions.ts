"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  tournaments,
  divisions,
  courts,
  courtDivisions,
  users,
  registrations,
} from "@/lib/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
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

  const allowed: TournamentStatus[] = [
    "draft",
    "registration_open",
    "registration_closed",
    "in_progress",
    "completed",
  ];
  if (!allowed.includes(status)) {
    return { error: "Invalid tournament status" };
  }

  await db
    .update(tournaments)
    .set({ status, updatedAt: new Date() })
    .where(eq(tournaments.id, tournamentId));

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/brackets`);
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

export async function updateDivision(
  tournamentId: string,
  divisionId: string,
  formData: FormData
) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can edit divisions" };
  }

  const [existingDiv] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);

  if (!existingDiv || existingDiv.tournamentId !== tournamentId) {
    return { error: "Division not found" };
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

  const normalizedName = parsed.data.name.trim().toLowerCase();

  const others = await db
    .select({ name: divisions.name })
    .from(divisions)
    .where(
      and(
        eq(divisions.tournamentId, tournamentId),
        ne(divisions.id, divisionId)
      )
    );

  if (
    others.some((d) => d.name.trim().toLowerCase() === normalizedName)
  ) {
    return { error: "A pool/division with this name already exists" };
  }

  await db
    .update(divisions)
    .set({
      name: parsed.data.name.trim(),
      format: parsed.data.format,
      teamCap: parsed.data.teamCap ?? null,
    })
    .where(eq(divisions.id, divisionId));

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/brackets`);
  return { success: true };
}

export async function setCourtsForDivision(
  tournamentId: string,
  divisionId: string,
  courtIds: string[]
) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can assign courts" };
  }

  const [div] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);

  if (!div || div.tournamentId !== tournamentId) {
    return { error: "Division not found" };
  }

  const uniqueIds = [...new Set(courtIds)];
  if (uniqueIds.length !== courtIds.length) {
    return { error: "Duplicate court selection" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(courtDivisions)
        .where(eq(courtDivisions.divisionId, divisionId));

      if (uniqueIds.length === 0) return;

      const rows = await tx
        .select({ id: courts.id })
        .from(courts)
        .where(
          and(
            eq(courts.tournamentId, tournamentId),
            inArray(courts.id, uniqueIds)
          )
        );

      if (rows.length !== uniqueIds.length) {
        throw new Error("invalid_courts");
      }

      await tx.insert(courtDivisions).values(
        uniqueIds.map((courtId) => ({ courtId, divisionId }))
      );
    });
  } catch {
    return { error: "Could not update court assignments" };
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function setRegistrationDivision(
  registrationId: string,
  divisionId: string | null
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
    return { error: "Only the organizer can assign divisions" };
  }

  if (divisionId) {
    const [div] = await db
      .select()
      .from(divisions)
      .where(eq(divisions.id, divisionId))
      .limit(1);

    if (!div || div.tournamentId !== reg.tournamentId) {
      return { error: "Invalid division for this tournament" };
    }
  }

  await db
    .update(registrations)
    .set({ divisionId })
    .where(eq(registrations.id, registrationId));

  revalidatePath(`/tournaments/${reg.tournamentId}`);
  revalidatePath(`/tournaments/${reg.tournamentId}/brackets`);
  return { success: true };
}
