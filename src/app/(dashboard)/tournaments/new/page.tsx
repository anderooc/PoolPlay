"use client";

import { useState } from "react";
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
import { todayISO } from "@/lib/tournament-status";
import { createTournament } from "../actions";

export default function NewTournamentPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(todayISO);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createTournament(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackLink href="/tournaments">All tournaments</BackLink>

      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Create Tournament</CardTitle>
            <CardDescription>
              Set up a new tournament. You can add divisions and courts after creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
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
