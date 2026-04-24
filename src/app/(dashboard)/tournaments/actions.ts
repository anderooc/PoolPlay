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
  matches,
  pools,
  brackets,
} from "@/lib/db/schema";
import { eq, and, ne, inArray, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { createTournamentSchema, createDivisionSchema } from "@/lib/validators";
import { checkContentFilter } from "@/lib/utils/content-filter";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
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

  const base = slugify(parsed.data.name, "tournament");
  const existingSlugs = await db
    .select({ slug: tournaments.slug })
    .from(tournaments);
  const slug = uniqueSlug(
    base,
    existingSlugs.map((t) => t.slug)
  );

  const [tournament] = await db
    .insert(tournaments)
    .values({
      organizerId: user.id,
      name: parsed.data.name,
      slug,
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

  redirect(`/tournaments/${tournament.slug}`);
}

export async function renameTournament(tournamentId: string, name: string) {
  const user = await requireUser();

  const parsed = createTournamentSchema
    .pick({ name: true })
    .safeParse({ name: name.trim() });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  const trimmed = parsed.data.name.trim();
  if (!trimmed) {
    return { error: "Tournament name is required" };
  }

  const contentError = checkContentFilter(trimmed);
  if (contentError) return { error: contentError };

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can rename this tournament" };
  }

  if (trimmed === tournament.name.trim()) {
    return { success: true as const, slug: tournament.slug };
  }

  const base = slugify(trimmed, "tournament");
  const otherSlugs = await db
    .select({ slug: tournaments.slug })
    .from(tournaments)
    .where(ne(tournaments.id, tournamentId));
  const newSlug = uniqueSlug(
    base,
    otherSlugs.map((r) => r.slug)
  );

  await db
    .update(tournaments)
    .set({
      name: trimmed,
      slug: newSlug,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, tournamentId));

  revalidatePath("/tournaments");
  revalidatePath("/explore");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/brackets", "page");
  revalidatePath("/tournaments/[slug]/scoring", "page");
  revalidatePath("/tournaments/[slug]/register", "page");

  return { success: true as const, slug: newSlug };
}

export async function deleteTournament(
  tournamentId: string,
  confirmationName: string
) {
  const user = await requireUser();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament || tournament.organizerId !== user.id) {
    return { error: "Only the organizer can delete this tournament" };
  }

  if (tournament.name.trim() !== confirmationName.trim()) {
    return {
      error:
        "Tournament name does not match — type it exactly as shown (including spaces).",
    };
  }

  try {
    await db.transaction(async (tx) => {
      const poolRows = await tx
        .select({ id: pools.id })
        .from(pools)
        .innerJoin(divisions, eq(pools.divisionId, divisions.id))
        .where(eq(divisions.tournamentId, tournamentId));

      const bracketRows = await tx
        .select({ id: brackets.id })
        .from(brackets)
        .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
        .where(eq(divisions.tournamentId, tournamentId));

      const courtRows = await tx
        .select({ id: courts.id })
        .from(courts)
        .where(eq(courts.tournamentId, tournamentId));

      const poolIds = poolRows.map((r) => r.id);
      const bracketIds = bracketRows.map((r) => r.id);
      const courtIds = courtRows.map((r) => r.id);

      const matchPredicates = [];
      if (poolIds.length > 0) {
        matchPredicates.push(inArray(matches.poolId, poolIds));
      }
      if (bracketIds.length > 0) {
        matchPredicates.push(inArray(matches.bracketId, bracketIds));
      }
      if (courtIds.length > 0) {
        matchPredicates.push(inArray(matches.courtId, courtIds));
      }

      if (matchPredicates.length === 1) {
        await tx.delete(matches).where(matchPredicates[0]);
      } else if (matchPredicates.length > 1) {
        await tx.delete(matches).where(or(...matchPredicates));
      }

      await tx.delete(tournaments).where(eq(tournaments.id, tournamentId));
    });
  } catch {
    return { error: "Could not delete tournament. Try again." };
  }

  revalidatePath("/tournaments");
  revalidatePath("/explore");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/brackets", "page");
  revalidatePath("/tournaments/[slug]/scoring", "page");
  revalidatePath("/tournaments/[slug]/register", "page");

  return { success: true as const };
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

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/brackets", "page");
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

  const [inserted] = await db
    .insert(divisions)
    .values({
      tournamentId,
      name: parsed.data.name.trim(),
      format: parsed.data.format,
      teamCap: parsed.data.teamCap ?? null,
    })
    .returning({ id: divisions.id });

  if (!inserted) {
    return { error: "Could not create division" };
  }

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const, id: inserted.id };
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

  revalidatePath("/tournaments/[slug]", "page");
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

  const [inserted] = await db
    .insert(courts)
    .values({ tournamentId, name })
    .returning({ id: courts.id });

  if (!inserted) {
    return { error: "Could not create court" };
  }

  revalidatePath("/tournaments/[slug]", "page");
  return { success: true as const, id: inserted.id };
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

  revalidatePath("/tournaments/[slug]", "page");
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

  revalidatePath("/tournaments/[slug]", "page");
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

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/brackets", "page");
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

  revalidatePath("/tournaments/[slug]", "page");
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

  revalidatePath("/tournaments/[slug]", "page");
  revalidatePath("/tournaments/[slug]/brackets", "page");
  return { success: true };
}
