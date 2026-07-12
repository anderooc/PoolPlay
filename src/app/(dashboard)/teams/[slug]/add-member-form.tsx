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
        <p className="mt-2 text-sm text-success">Player added!</p>
      )}
    </div>
  );
}
