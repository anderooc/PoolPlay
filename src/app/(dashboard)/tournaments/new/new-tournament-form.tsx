"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
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
import { DatePickerField } from "@/components/date-picker";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { todayISO } from "@/lib/tournament-status";
import type { HostingSchoolOption } from "@/lib/schools/hosting";
import type { TeamGender, TeamRegion } from "@/types";
import { createTournament } from "../actions";

export function NewTournamentForm({
  hostSchool,
}: {
  hostSchool: HostingSchoolOption | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(todayISO);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const result = await createTournament(formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch {
        // Successful create triggers Next.js redirect (throws) — ignore.
      }
    });
  }

  if (!hostSchool) {
    return (
      <div className="space-y-6">
        <BackLink href="/tournaments">All tournaments</BackLink>
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Join or create a school first</CardTitle>
            <CardDescription>
              Tournaments are hosted by a school. You need to be a school
              president or officer, then return here to host an event.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button render={<Link href="/schools/new" />}>Create school</Button>
            <Button variant="outline" render={<Link href="/schools" />}>
              Browse schools
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BackLink href="/tournaments">All tournaments</BackLink>

      <div className="mx-auto max-w-lg">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Create Tournament</CardTitle>
            <CardDescription className="text-xs">
              Gender and region are set from your school.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-2.5" aria-busy={isPending}>
              <div className="space-y-1">
                <Label className="text-xs">Hosting school</Label>
                <div className="rounded-lg border bg-muted/40 px-2.5 py-2">
                  <p className="text-sm font-medium">{hostSchool.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {hostSchool.university}
                  </p>
                  <TeamAttributesBadges
                    gender={hostSchool.gender as TeamGender}
                    region={hostSchool.region as TeamRegion}
                    className="mt-2"
                  />
                </div>
                <input type="hidden" name="hostSchoolId" value={hostSchool.id} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Spring Invitational 2026"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Start time, fees, format, and other details for teams..."
                  rows={3}
                  className="min-h-0 text-sm"
                  disabled={isPending}
                />
              </div>
              <DatePickerField
                id="date"
                label="Date"
                name="date"
                value={date}
                onChange={setDate}
                required
                placement="top"
                rangeFromDates={[date]}
                disabled={isPending}
              />
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="University Gym"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Main St, City, ST 12345"
                  disabled={isPending}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? "Creating..." : "Create Tournament"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
