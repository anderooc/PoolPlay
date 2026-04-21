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
  /** Tournament organizer — copy reflects host registration */
  asHost?: boolean;
}

export function RegisterForm({ tournamentId, teams, asHost = false }: Props) {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError("Please select a team");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await registerTeam(tournamentId, teamId);
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
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value) => {
                if (value == null || value === "") {
                  return (
                    <span className="text-muted-foreground">Select a team</span>
                  );
                }
                const team = teams.find((t) => t.id === value);
                return team
                  ? `${team.name} (${team.university})`
                  : String(value);
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem
                key={team.id}
                value={team.id}
                label={`${team.name} (${team.university})`}
              >
                {team.name} ({team.university})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {asHost
          ? "Assign divisions and pools later from the tournament dashboard."
          : "Division and pool placement is set by the tournament organizer after you register."}
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Registering..." : "Register Team"}
      </Button>
    </form>
  );
}
