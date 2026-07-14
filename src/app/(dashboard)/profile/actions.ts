"use server";

/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  removeProfileAvatar,
  uploadProfileAvatar,
} from "@/lib/profile/avatar-storage";
import { updateProfileSchema } from "@/lib/validators";
import { checkContentFilter } from "@/lib/utils/content-filter";
import { flagBlockedContent } from "@/lib/admin/content-flags";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    playerGender: formData.get("playerGender"),
    volleyballPosition: formData.get("volleyballPosition"),
    displayEmail: formData.get("displayEmail"),
    displaySchool: formData.get("displaySchool"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const contentError = checkContentFilter(
    parsed.data.fullName,
    parsed.data.displaySchool ?? undefined
  );
  if (contentError) return { error: contentError };

  const moderationError = await flagBlockedContent(user.id, [
    { area: "profile.full_name", text: parsed.data.fullName },
    { area: "profile.display_school", text: parsed.data.displaySchool },
  ]);
  if (moderationError) return { error: moderationError };

  let avatarStoragePath = user.avatarStoragePath;
  const removeAvatar = formData.get("removeAvatar") === "true";
  const avatarFile = formData.get("avatar");

  try {
    if (removeAvatar) {
      await removeProfileAvatar(avatarStoragePath);
      avatarStoragePath = null;
    } else if (avatarFile instanceof File && avatarFile.size > 0) {
      const bytes = new Uint8Array(await avatarFile.arrayBuffer());
      avatarStoragePath = await uploadProfileAvatar(
        user.id,
        bytes,
        avatarFile.type
      );
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update profile photo.",
    };
  }

  const [updated] = await db
    .update(users)
    .set({
      fullName: parsed.data.fullName,
      playerGender: parsed.data.playerGender,
      volleyballPosition: parsed.data.volleyballPosition,
      displayEmail: parsed.data.displayEmail,
      displaySchool: parsed.data.displaySchool,
      avatarStoragePath,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) {
    return { error: "Could not save profile." };
  }

  try {
    const supabase = await createClient();
    await supabase.auth.updateUser({
      data: { full_name: parsed.data.fullName },
    });
  } catch {
    // Profile saved in DB; auth metadata sync is best-effort.
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true as const };
}
