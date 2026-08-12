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

import { createAdminClient } from "@/lib/supabase/admin";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function profileAvatarStoragePath(userId: string, ext: string): string {
  return `${userId}/avatar.${ext}`;
}

export function profileAvatarPublicUrl(
  storagePath: string | null | undefined
): string | null {
  if (!storagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${PROFILE_AVATAR_BUCKET}/${storagePath}`;
}

function extensionForMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

/** Basic magic-byte check for common image formats. */
export function validateAvatarBytes(bytes: Uint8Array, mime: string): boolean {
  if (!ALLOWED_AVATAR_TYPES.has(mime)) return false;
  if (bytes.length < 12) return false;

  if (mime === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mime === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

export async function uploadProfileAvatar(
  userId: string,
  bytes: Uint8Array,
  mime: string
): Promise<string> {
  if (bytes.length > PROFILE_AVATAR_MAX_BYTES) {
    throw new Error("Profile photo must be 2 MB or smaller.");
  }
  if (!validateAvatarBytes(bytes, mime)) {
    throw new Error("Upload a valid JPEG, PNG, or WebP image.");
  }

  const ext = extensionForMime(mime);
  if (!ext) {
    throw new Error("Unsupported image type.");
  }

  const path = profileAvatarStoragePath(userId, ext);
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function removeProfileAvatar(
  storagePath: string | null | undefined
): Promise<void> {
  if (!storagePath) return;
  const supabase = createAdminClient();
  await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([storagePath]);
}
