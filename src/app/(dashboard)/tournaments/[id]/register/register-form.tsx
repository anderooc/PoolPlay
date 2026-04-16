"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerTeam } from "./actions";

interface Props {
  tournamentId: string;
  teams: { id: string; name: string; university: string }[];
  divisions: { id: string; name: string }[];
}

export function RegisterForm({ tournamentId, teams, divisions }: Props) {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !divisionId) {
      setError("Please select both a team and a division");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await registerTeam(tournamentId, teamId, divisionId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/tournaments/${tournamentId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Team</Label>
        <Select value={teamId} onValueChange={(v) => setTeamId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name} ({team.university})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Division</Label>
        <Select value={divisionId} onValueChange={(v) => setDivisionId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select a division" />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((div) => (
              <SelectItem key={div.id} value={div.id}>
                {div.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Registering..." : "Register Team"}
      </Button>
    </form>
  );
}
