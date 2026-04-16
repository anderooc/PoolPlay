"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTeamMember } from "../actions";

export function AddMemberForm({ teamId }: { teamId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const result = await addTeamMember(teamId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <div>
      <h3 className="font-semibold mb-3">Add Player</h3>
      <form action={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="player@university.edu"
            required
          />
        </div>
        <div className="w-24 space-y-1">
          <Label htmlFor="jerseyNumber" className="sr-only">
            Jersey #
          </Label>
          <Input
            id="jerseyNumber"
            name="jerseyNumber"
            type="number"
            placeholder="#"
            min={0}
            max={99}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {success && (
        <p className="mt-2 text-sm text-green-600">Player added!</p>
      )}
    </div>
  );
}
