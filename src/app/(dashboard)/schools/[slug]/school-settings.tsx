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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TEAM_GENDERS,
  TEAM_GENDER_LABELS,
  TEAM_REGIONS,
  TEAM_REGION_LABELS,
} from "@/lib/constants/team";
import { cn } from "@/lib/utils";
import type { TeamGender, TeamRegion } from "@/types";
import { updateSchool } from "../actions";

const selectClassName = cn(
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50"
);

export type SchoolSettingsDefaults = {
  name: string;
  university: string;
  gender: TeamGender;
  region: TeamRegion;
  description: string | null;
  websiteUrl: string | null;
  domainHint: string | null;
};

export function SchoolSettingsDialog({
  schoolId,
  defaults,
  open,
  onOpenChange,
}: {
  schoolId: string;
  defaults: SchoolSettingsDefaults;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await updateSchool(schoolId, formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    if (result?.slug) {
      router.replace(`/schools/${result.slug}`);
    }
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Edit school details</DialogTitle>
          <DialogDescription>
            Renaming the school updates the URL slug. Existing teams keep their
            gender and region; only new teams created under this school inherit
            the values below.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-settings-name">School name</Label>
            <Input
              id="school-settings-name"
              name="name"
              defaultValue={defaults.name}
              required
              maxLength={120}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-settings-university">University</Label>
            <Input
              id="school-settings-university"
              name="university"
              defaultValue={defaults.university}
              required
              maxLength={120}
              disabled={loading}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="school-settings-gender">Gender</Label>
              <select
                id="school-settings-gender"
                name="gender"
                className={selectClassName}
                defaultValue={defaults.gender}
                required
                disabled={loading}
              >
                {TEAM_GENDERS.map((value) => (
                  <option key={value} value={value}>
                    {TEAM_GENDER_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-settings-region">Region</Label>
              <select
                id="school-settings-region"
                name="region"
                className={selectClassName}
                defaultValue={defaults.region}
                required
                disabled={loading}
              >
                {TEAM_REGIONS.map((value) => (
                  <option key={value} value={value}>
                    {TEAM_REGION_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-settings-domainHint">
              Institutional email domain
            </Label>
            <Input
              id="school-settings-domainHint"
              name="domainHint"
              defaultValue={defaults.domainHint ?? ""}
              placeholder="state.edu"
              maxLength={120}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-settings-websiteUrl">Website</Label>
            <Input
              id="school-settings-websiteUrl"
              name="websiteUrl"
              defaultValue={defaults.websiteUrl ?? ""}
              placeholder="https://stateu-volleyball.org"
              maxLength={200}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-settings-description">Description</Label>
            <Textarea
              id="school-settings-description"
              name="description"
              rows={3}
              defaultValue={defaults.description ?? ""}
              maxLength={2000}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
