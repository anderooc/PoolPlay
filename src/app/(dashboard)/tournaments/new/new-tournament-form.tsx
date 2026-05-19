"use client";

import { useMemo, useState } from "react";
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
import { formatTeamAttributes } from "@/lib/labels/team";
import { todayISO } from "@/lib/tournament-status";
import type { HostingTeamOption } from "@/lib/teams/hosting";
import type { TeamGender, TeamRegion } from "@/types";
import { createTournament } from "../actions";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

export function NewTournamentForm({
  hostingTeams,
}: {
  hostingTeams: HostingTeamOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(todayISO);
  const [hostTeamId, setHostTeamId] = useState(hostingTeams[0]?.id ?? "");

  const selectedTeam = useMemo(
    () => hostingTeams.find((t) => t.id === hostTeamId),
    [hostingTeams, hostTeamId]
  );

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createTournament(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  if (hostingTeams.length === 0) {
    return (
      <div className="space-y-6">
        <BackLink href="/tournaments">All tournaments</BackLink>
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Create a team first</CardTitle>
            <CardDescription>
              Tournaments inherit gender and region from the hosting team. Create
              a team you captain, then return here to host an event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<a href="/teams/new" />}>Create team</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/tournaments">All tournaments</BackLink>

      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Create Tournament</CardTitle>
            <CardDescription>
              Gender and region are set from your hosting team (e.g. Emory
              Men&apos;s · Southeast).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hostTeamId">Hosting team</Label>
                <select
                  id="hostTeamId"
                  name="hostTeamId"
                  className={selectClassName}
                  value={hostTeamId}
                  onChange={(e) => setHostTeamId(e.target.value)}
                  required
                >
                  {hostingTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.university}) —{" "}
                      {formatTeamAttributes(
                        team.gender as TeamGender,
                        team.region as TeamRegion
                      )}
                    </option>
                  ))}
                </select>
                {selectedTeam && (
                  <TeamAttributesBadges
                    gender={selectedTeam.gender as TeamGender}
                    region={selectedTeam.region as TeamRegion}
                    className="pt-1"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Spring Invitational 2026"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Details about the tournament..."
                  rows={3}
                />
              </div>
              <DatePickerField
                id="date"
                label="Date"
                name="date"
                value={date}
                onChange={setDate}
                required
                rangeFromDates={[date]}
              />
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="University Gym"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Main St, City, ST 12345"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Tournament"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
