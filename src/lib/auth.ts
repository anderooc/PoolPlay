import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentAuthProfile() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  return {
    email: authUser.email ?? "",
    fullName:
      (authUser.user_metadata?.full_name as string | undefined) ??
      authUser.email?.split("@")[0] ??
      "User",
  };
}

/**
 * De-duplicates the auth-user + DB lookup within a single server request.
 * Layouts, pages, and components that all call getCurrentUser() share one
 * result instead of each triggering their own round-trips to Supabase Auth
 * and the database.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.authId, authUser.id))
    .limit(1);

  if (dbUser) return dbUser;

  // Auth user exists but no DB row (signup succeeded in Supabase Auth
  // but the DB insert failed, e.g. due to a connection issue at the time).
  // Auto-create the missing row so the app doesn't redirect-loop.
  const meta = authUser.user_metadata ?? {};
  const [newUser] = await db
    .insert(users)
    .values({
      authId: authUser.id,
      email: authUser.email ?? "",
      fullName: (meta.full_name as string) || authUser.email?.split("@")[0] || "User",
      university: (meta.university as string) || null,
      role: "player",
    })
    .onConflictDoNothing({ target: users.authId })
    .returning();

  return newUser ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
