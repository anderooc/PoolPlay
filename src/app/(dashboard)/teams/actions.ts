"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { createTeamSchema } from "@/lib/validators";
import { checkContentFilter } from "@/lib/utils/content-filter";
import { slugify, uniqueSlug } from "@/lib/utils/slug";

export async function createTeam(formData: FormData) {
  const user = await requireUser();

  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    university: formData.get("university"),
    season: formData.get("season") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const teamContentError = checkContentFilter(
    parsed.data.name,
    parsed.data.university,
    parsed.data.season
  );
  if (teamContentError) return { error: teamContentError };

  const [existing] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        eq(teams.name, parsed.data.name),
        eq(teams.university, parsed.data.university)
      )
    )
    .limit(1);

  if (existing) {
    return { error: "A team with this name already exists at this university" };
  }

  const base = slugify(
    `${parsed.data.name} ${parsed.data.university}`,
    "team"
  );
  const existingSlugs = await db.select({ slug: teams.slug }).from(teams);
  const slug = uniqueSlug(
    base,
    existingSlugs.map((t) => t.slug)
  );

  const [team] = await db
    .insert(teams)
    .values({
      name: parsed.data.name,
      slug,
      university: parsed.data.university,
      season: parsed.data.season || null,
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: "captain",
  });

  // Promote user to captain role if currently player
  if (user.role === "player") {
    await db
      .update(users)
      .set({ role: "captain" })
      .where(eq(users.id, user.id));
  }

  redirect(`/teams/${team.slug}`);
}

export async function addTeamMember(teamId: string, formData: FormData) {
  const user = await requireUser();
  const email = formData.get("email") as string;

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
    );

  if (!membership || membership.role !== "captain") {
    return { error: "Only captains can add members" };
  }

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!targetUser) {
    return { error: "No user found with that email" };
  }

  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUser.id)
      )
    );

  if (existing) {
    return { error: "User is already on this team" };
  }

  const jerseyNumber = formData.get("jerseyNumber");

  await db.insert(teamMembers).values({
    teamId,
    userId: targetUser.id,
    role: "player",
    jerseyNumber: jerseyNumber ? parseInt(jerseyNumber as string, 10) : null,
  });

  revalidatePath("/teams/[slug]", "page");
  return { success: true };
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const user = await requireUser();

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
    );

  if (!membership || membership.role !== "captain") {
    return { error: "Only captains can remove members" };
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

  revalidatePath("/teams/[slug]", "page");
  return { success: true };
}

export async function updateJerseyNumber(
  memberId: string,
  jerseyNumber: number | null
) {
  await db
    .update(teamMembers)
    .set({ jerseyNumber })
    .where(eq(teamMembers.id, memberId));

  revalidatePath("/teams");
  return { success: true };
}
