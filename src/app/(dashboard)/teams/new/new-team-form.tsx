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

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SmartBackLink } from "@/components/layout/smart-back-link";
import { TeamAttributeFields } from "@/components/team-attribute-fields";
import { cn } from "@/lib/utils";
import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";
import type { TeamGender, TeamRegion } from "@/types";
import { createTeam } from "../actions";

const STANDALONE_VALUE = "__standalone__";

const selectClassName = cn(
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50"
);

interface SchoolOption {
  id: string;
  slug: string;
  name: string;
  gender: TeamGender;
  region: TeamRegion;
}

export function NewTeamForm({
  schools,
  preselectedSchoolId,
}: {
  schools: SchoolOption[];
  preselectedSchoolId: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitted = useRef(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    preselectedSchoolId && schools.some((s) => s.id === preselectedSchoolId)
      ? preselectedSchoolId
      : STANDALONE_VALUE
  );

  const selectedSchool = useMemo(
    () =>
      selectedSchoolId === STANDALONE_VALUE
        ? null
        : schools.find((s) => s.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId]
  );

  async function handleSubmit(formData: FormData) {
    if (submitted.current) return;
    submitted.current = true;
    setLoading(true);
    setError(null);
    if (selectedSchoolId !== STANDALONE_VALUE) {
      formData.set("schoolId", selectedSchoolId);
    } else {
      formData.delete("schoolId");
    }
    const result = await createTeam(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      submitted.current = false;
    }
  }

  const backFallback = selectedSchool
    ? `/schools/${selectedSchool.slug}`
    : "/teams";

  return (
    <div className="space-y-3">
      <SmartBackLink fallbackHref={backFallback}>Back</SmartBackLink>
      <div className="mx-auto max-w-lg">
        <Card className="shadow-sm shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Create team
            </CardTitle>
            <CardDescription className="text-pretty">
              You&apos;ll be added as captain. Linking the team to a school
              lets you draw players from the school&apos;s master roster, and
              the team inherits the school&apos;s gender and region.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolId">Part of a school</Label>
                {schools.length === 0 ? (
                  <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                    You&apos;re not yet a president or officer of any school.{" "}
                    <Link
                      href="/schools/new"
                      className="text-foreground underline underline-offset-4"
                    >
                      Create a school
                    </Link>{" "}
                    to manage multiple teams from one place, or continue with
                    a standalone team.
                  </p>
                ) : (
                  <select
                    id="schoolId"
                    name="schoolIdSelect"
                    className={selectClassName}
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                  >
                    <option value={STANDALONE_VALUE}>
                      None — standalone team
                    </option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Team name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Club Volleyball A"
                  required
                />
              </div>
              {selectedSchool ? (
                <div className="space-y-2">
                  <Label>Gender &amp; region</Label>
                  <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <Badge variant="secondary">
                      {formatTeamGender(selectedSchool.gender)}
                    </Badge>
                    <Badge variant="outline">
                      {formatTeamRegion(selectedSchool.region)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Inherited from {selectedSchool.name}
                    </span>
                  </div>
                  <input
                    type="hidden"
                    name="gender"
                    value={selectedSchool.gender}
                  />
                  <input
                    type="hidden"
                    name="region"
                    value={selectedSchool.region}
                  />
                </div>
              ) : (
                <TeamAttributeFields />
              )}
              {!selectedSchool && (
                <p className="text-sm text-muted-foreground">
                  Standalone teams are submitted for admin approval before they
                  can register for tournaments.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create team"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
