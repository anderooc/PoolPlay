"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createTeam } from "../actions";

export default function NewTeamPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitted = useRef(false);

  async function handleSubmit(formData: FormData) {
    if (submitted.current) return;
    submitted.current = true;
    setLoading(true);
    setError(null);
    const result = await createTeam(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      submitted.current = false;
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Create Team</CardTitle>
          <CardDescription>
            Set up a new club volleyball team. You&apos;ll be added as captain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input id="name" name="name" placeholder="Club Volleyball A" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                name="university"
                placeholder="State University"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season">Season (optional)</Label>
              <Input id="season" name="season" placeholder="Spring 2026" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
