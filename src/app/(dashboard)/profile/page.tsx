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

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { pageMetadata } from "@/lib/metadata";
import { profileAvatarPublicUrl } from "@/lib/profile/avatar-storage";
import { ProfileForm } from "./profile-form";

export const metadata = pageMetadata("Edit profile");

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>
        <p className="text-sm text-muted-foreground">
          Update how you appear across PoolPlay.
        </p>
      </div>

      <ProfileForm
        defaults={{
          fullName: user.fullName,
          playerGender: user.playerGender,
          volleyballPosition: user.volleyballPosition,
          displayEmail: user.displayEmail ?? user.email,
          displaySchool: user.displaySchool ?? user.university,
          avatarUrl: profileAvatarPublicUrl(user.avatarStoragePath),
        }}
      />
    </div>
  );
}
