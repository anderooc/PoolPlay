"use client";

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

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  USER_PLAYER_GENDERS,
  USER_PLAYER_GENDER_LABELS,
  VOLLEYBALL_POSITIONS,
  VOLLEYBALL_POSITION_LABELS,
} from "@/lib/constants/profile";
import { cn } from "@/lib/utils";
import type { UserPlayerGender, VolleyballPosition } from "@/types";
import { updateProfile } from "./actions";

const selectClassName = cn(
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50"
);

export type ProfileFormDefaults = {
  fullName: string;
  playerGender: UserPlayerGender | null;
  volleyballPosition: VolleyballPosition | null;
  displayEmail: string | null;
  displaySchool: string | null;
  avatarUrl: string | null;
};

export function ProfileForm({ defaults }: { defaults: ProfileFormDefaults }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    defaults.avatarUrl
  );

  const initials = useMemo(
    () =>
      defaults.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    [defaults.fullName]
  );

  function onAvatarChange(file: File | undefined) {
    if (!file) return;
    setRemoveAvatar(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return objectUrl;
    });
  }

  function clearAvatar() {
    setRemoveAvatar(true);
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (removeAvatar) {
      formData.set("removeAvatar", "true");
    }

    const result = await updateProfile(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <Card className="shadow-sm shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-xl font-semibold tracking-tight">
          Public profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayEmail">Display email</Label>
            <Input
              id="displayEmail"
              name="displayEmail"
              type="email"
              defaultValue={defaults.displayEmail ?? ""}
              disabled={loading}
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              Shown on your profile. Does not change your sign-in email.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displaySchool">Display school</Label>
            <Input
              id="displaySchool"
              name="displaySchool"
              defaultValue={defaults.displaySchool ?? ""}
              placeholder="e.g. Emory University"
              maxLength={120}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 ring-2 ring-border">
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt="" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
                  {initials || <User className="h-8 w-8" aria-hidden />}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Camera className="mr-1.5 h-4 w-4" />
                Upload photo
              </Button>
              {(previewUrl || defaults.avatarUrl) && !removeAvatar ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAvatar}
                  disabled={loading}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) =>
                onAvatarChange(event.target.files?.[0] ?? undefined)
              }
            />
            <p className="text-xs text-muted-foreground sm:basis-full">
              JPEG, PNG, or WebP. Max 2 MB.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Display name</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={defaults.fullName}
              required
              maxLength={120}
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="playerGender">Gender</Label>
              <select
                id="playerGender"
                name="playerGender"
                className={selectClassName}
                defaultValue={defaults.playerGender ?? ""}
                disabled={loading}
              >
                <option value="">Not set</option>
                {USER_PLAYER_GENDERS.map((value) => (
                  <option key={value} value={value}>
                    {USER_PLAYER_GENDER_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volleyballPosition">Volleyball position</Label>
              <select
                id="volleyballPosition"
                name="volleyballPosition"
                className={selectClassName}
                defaultValue={defaults.volleyballPosition ?? ""}
                disabled={loading}
              >
                <option value="">Not set</option>
                {VOLLEYBALL_POSITIONS.map((value) => (
                  <option key={value} value={value}>
                    {VOLLEYBALL_POSITION_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
