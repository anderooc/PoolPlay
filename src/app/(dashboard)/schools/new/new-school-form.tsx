"use client";

/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BackLink } from "@/components/layout/back-link";
import {
  TEAM_GENDERS,
  TEAM_GENDER_LABELS,
  TEAM_REGIONS,
  TEAM_REGION_LABELS,
} from "@/lib/constants/team";
import { cn } from "@/lib/utils";
import { createSchool } from "../actions";

const selectClassName = cn(
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50"
);

export function NewSchoolForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitted = useRef(false);

  async function handleSubmit(formData: FormData) {
    if (submitted.current) return;
    submitted.current = true;
    setLoading(true);
    setError(null);
    const result = await createSchool(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      submitted.current = false;
    }
  }

  return (
    <div className="space-y-3">
      <BackLink href="/schools">Find schools</BackLink>
      <div className="mx-auto max-w-lg">
        <Card className="shadow-sm shadow-primary/5">
          <CardHeader>
            <CardTitle as="h1" className="text-xl font-semibold tracking-tight">
              Create school
            </CardTitle>
            <CardDescription className="text-pretty">
              You&apos;ll be added as president. Add officers from the school
              page after creation; the school becomes eligible for verification
              once it has a president and at least one officer. Teams created
              under this school inherit its gender and region.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">School / club name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="State University Volleyball Club"
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input
                  id="university"
                  name="university"
                  placeholder="State University"
                  required
                  maxLength={120}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    name="gender"
                    className={selectClassName}
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    {TEAM_GENDERS.map((value) => (
                      <option key={value} value={value}>
                        {TEAM_GENDER_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <select
                    id="region"
                    name="region"
                    className={selectClassName}
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select region
                    </option>
                    {TEAM_REGIONS.map((value) => (
                      <option key={value} value={value}>
                        {TEAM_REGION_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="domainHint">
                  Institutional email domain{" "}
                  <span className="text-xs text-muted-foreground">
                    (used during verification)
                  </span>
                </Label>
                <Input
                  id="domainHint"
                  name="domainHint"
                  placeholder="state.edu"
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground">
                  Officers&apos; emails ending with this domain will auto-flag
                  your verification submission for an admin to review.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">
                  Website{" "}
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  placeholder="https://stateu-volleyball.org"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description{" "}
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="A few sentences about your club, its teams, and what year you were founded."
                  maxLength={2000}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create school"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
