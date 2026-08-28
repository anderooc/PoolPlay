/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { flagBlockedContent } from "@/lib/admin/content-flags";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  assignUserJerseyNumber,
} from "@/lib/profile/jersey-number-store";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validators";
import { checkContentFilter } from "@/lib/utils/content-filter";
import type { ViewerContract } from "../contracts/viewer";
import { ApiError, badRequest } from "../errors";
import { buildViewerContract } from "../projections/viewer";

function statelessAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

export async function updateProfileForViewer(
  user: AppUser,
  input: {
    fullName: string;
    playerGender?: string | null;
    volleyballPosition?: string | null;
    jerseyNumber?: string | null;
  }
): Promise<ViewerContract> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid profile.");
  }

  const contentError = checkContentFilter(parsed.data.fullName);
  if (contentError) throw badRequest(contentError);

  const moderationError = await flagBlockedContent(user.id, [
    { area: "profile.full_name", text: parsed.data.fullName },
  ]);
  if (moderationError) throw badRequest(moderationError);

  const jerseyResult = await assignUserJerseyNumber(db, {
    userId: user.id,
    jerseyNumber: parsed.data.jerseyNumber,
  });
  if ("error" in jerseyResult) {
    throw badRequest(jerseyResult.error);
  }

  const [updated] = await db
    .update(users)
    .set({
      fullName: parsed.data.fullName,
      playerGender: parsed.data.playerGender,
      volleyballPosition: parsed.data.volleyballPosition,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) {
    throw badRequest("Could not save profile.");
  }

  try {
    await statelessAuthClient().auth.updateUser({
      data: { full_name: parsed.data.fullName },
    });
  } catch {
    // DB is source of truth; auth metadata sync is best-effort.
  }

  return buildViewerContract({
    ...user,
    fullName: updated.fullName,
    playerGender: updated.playerGender,
    volleyballPosition: updated.volleyballPosition,
    jerseyNumber: updated.jerseyNumber,
    updatedAt: updated.updatedAt,
  });
}

export async function changePasswordForViewer(
  user: AppUser,
  input: {
    currentPassword: string;
    password: string;
    confirmPassword: string;
  }
): Promise<{ success: true }> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid password.");
  }

  const supabase = statelessAuthClient();

  try {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) {
      throw badRequest("Current password is incorrect.");
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) {
      throw badRequest(error.message);
    }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw badRequest(
      "Authentication service is unavailable. Try again in a few minutes."
    );
  }

  return { success: true };
}
