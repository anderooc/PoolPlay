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
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import {
  accountDeletionRequests,
  contentFlags,
  schoolMembers,
  teamMembers,
  tournamentChatMessages,
  tournamentChatReadCursors,
  users,
  waiverCompletions,
} from "@/lib/db/schema";
import {
  removeProfileAvatar,
  uploadProfileAvatar,
  validateAvatarBytes,
  PROFILE_AVATAR_MAX_BYTES,
} from "@/lib/profile/avatar-storage";
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

export async function updateAvatarForViewer(
  user: AppUser,
  input: { base64: string; contentType: string }
): Promise<ViewerContract> {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(input.base64, "base64"));
  } catch {
    throw badRequest("Invalid image payload.");
  }

  if (bytes.byteLength > PROFILE_AVATAR_MAX_BYTES) {
    throw badRequest("Profile photo must be 2 MB or smaller.");
  }
  if (!validateAvatarBytes(bytes, input.contentType)) {
    throw badRequest("Photo must be a valid JPEG, PNG, or WebP image.");
  }

  let avatarStoragePath: string;
  try {
    await removeProfileAvatar(user.avatarStoragePath);
    avatarStoragePath = await uploadProfileAvatar(
      user.id,
      bytes,
      input.contentType
    );
  } catch (error) {
    throw badRequest(
      error instanceof Error ? error.message : "Could not update profile photo."
    );
  }

  const [updated] = await db
    .update(users)
    .set({ avatarStoragePath, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) {
    throw badRequest("Could not save profile photo.");
  }

  return buildViewerContract({
    ...user,
    avatarStoragePath: updated.avatarStoragePath,
    updatedAt: updated.updatedAt,
  });
}

export async function removeAvatarForViewer(
  user: AppUser
): Promise<ViewerContract> {
  try {
    await removeProfileAvatar(user.avatarStoragePath);
  } catch (error) {
    throw badRequest(
      error instanceof Error ? error.message : "Could not remove profile photo."
    );
  }

  const [updated] = await db
    .update(users)
    .set({ avatarStoragePath: null, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) {
    throw badRequest("Could not remove profile photo.");
  }

  return buildViewerContract({
    ...user,
    avatarStoragePath: null,
    updatedAt: updated.updatedAt,
  });
}

export async function deleteAccountForViewer(
  user: AppUser,
  input: { password: string; confirmation: string }
): Promise<{ success: true }> {
  if (!input.password) {
    throw badRequest("Enter your password to continue.");
  }
  if (input.confirmation !== "DELETE") {
    throw badRequest("Type DELETE exactly to confirm.");
  }

  const supabase = statelessAuthClient();
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: input.password,
    });
    if (error) throw badRequest("Your password is incorrect.");
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw badRequest("Could not verify your password. Try again later.");
  }

  let admin;
  try {
    admin = createAdminClient();
    await removeProfileAvatar(user.avatarStoragePath);
  } catch (error) {
    throw badRequest(
      error instanceof Error
        ? error.message
        : "Account deletion is temporarily unavailable."
    );
  }

  const requestId = await db.transaction(async (tx) => {
    const [request] = await tx
      .insert(accountDeletionRequests)
      .values({ authId: user.authId })
      .returning({ id: accountDeletionRequests.id });

    await tx
      .delete(tournamentChatReadCursors)
      .where(eq(tournamentChatReadCursors.userId, user.id));
    await tx
      .delete(tournamentChatMessages)
      .where(eq(tournamentChatMessages.authorUserId, user.id));
    await tx.delete(contentFlags).where(eq(contentFlags.userId, user.id));
    await tx.delete(teamMembers).where(eq(teamMembers.userId, user.id));
    await tx.delete(schoolMembers).where(eq(schoolMembers.userId, user.id));
    await tx
      .update(waiverCompletions)
      .set({ signedName: null })
      .where(eq(waiverCompletions.userId, user.id));
    await tx
      .update(users)
      .set({
        authId: `deleted:${request.id}`,
        email: `${request.id}@deleted.brackt.invalid`,
        fullName: "Deleted user",
        university: null,
        avatarStoragePath: null,
        playerGender: null,
        volleyballPosition: null,
        jerseyNumber: null,
        displayEmail: null,
        displaySchool: null,
        role: "player",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return request.id;
  });

  const { error: deletionError } = await admin.auth.admin.deleteUser(user.authId);
  await db
    .update(accountDeletionRequests)
    .set(
      deletionError
        ? { lastError: deletionError.message }
        : { completedAt: new Date(), lastError: null }
    )
    .where(eq(accountDeletionRequests.id, requestId));

  if (deletionError) {
    throw badRequest(deletionError.message);
  }

  return { success: true };
}
