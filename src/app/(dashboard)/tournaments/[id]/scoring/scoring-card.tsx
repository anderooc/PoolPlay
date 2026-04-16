"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { updateScore, finalizeMatch, startMatch } from "./actions";
import { format } from "date-fns";

interface MatchSet {
  id: string;
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
}

interface ScoringMatch {
  id: string;
  status: string;
  scheduledTime: Date | null;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  courtName: string | null;
  winnerId: string | null;
  sets: MatchSet[];
}

export function ScoringCard({
  match,
  canScore,
}: {
  match: ScoringMatch;
  canScore: boolean;
}) {
  const [newSetNumber, setNewSetNumber] = useState(
    (match.sets.length || 0) + 1
  );
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleScoreSubmit() {
    setLoading(true);
    const formData = new FormData();
    formData.set("matchId", match.id);
    formData.set("setNumber", String(newSetNumber));
    formData.set("teamAScore", String(teamAScore));
    formData.set("teamBScore", String(teamBScore));
    await updateScore(formData);
    setNewSetNumber((prev) => prev + 1);
    setTeamAScore(0);
    setTeamBScore(0);
    setLoading(false);
  }

  async function handleFinalize(winnerId: string) {
    setLoading(true);
    await finalizeMatch(match.id, winnerId);
    setLoading(false);
  }

  async function handleStart() {
    setLoading(true);
    await startMatch(match.id);
    setLoading(false);
  }

  const teamASetsWon = match.sets.filter(
    (s) => s.teamAScore > s.teamBScore
  ).length;
  const teamBSetsWon = match.sets.filter(
    (s) => s.teamBScore > s.teamAScore
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {match.teamA?.name ?? "TBD"} vs {match.teamB?.name ?? "TBD"}
          </CardTitle>
          <Badge
            variant={
              match.status === "in_progress"
                ? "default"
                : match.status === "completed"
                  ? "secondary"
                  : "outline"
            }
          >
            {match.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {match.courtName && `${match.courtName}`}
          {match.scheduledTime &&
            ` \u00B7 ${format(match.scheduledTime, "h:mm a")}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score display */}
        <div className="flex items-center justify-center gap-6 text-center">
          <div>
            <p className="text-2xl font-bold">{teamASetsWon}</p>
            <p className="text-xs text-muted-foreground">
              {match.teamA?.name ?? "A"}
            </p>
          </div>
          <span className="text-muted-foreground">-</span>
          <div>
            <p className="text-2xl font-bold">{teamBSetsWon}</p>
            <p className="text-xs text-muted-foreground">
              {match.teamB?.name ?? "B"}
            </p>
          </div>
        </div>

        {/* Set scores */}
        {match.sets.length > 0 && (
          <div className="space-y-1">
            {match.sets.map((s) => (
              <div
                key={s.id}
                className="flex justify-between text-sm px-4"
              >
                <span>Set {s.setNumber}</span>
                <span>
                  <span
                    className={
                      s.teamAScore > s.teamBScore ? "font-semibold" : ""
                    }
                  >
                    {s.teamAScore}
                  </span>
                  {" - "}
                  <span
                    className={
                      s.teamBScore > s.teamAScore ? "font-semibold" : ""
                    }
                  >
                    {s.teamBScore}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Scoring controls */}
        {canScore && match.status === "upcoming" && match.teamA && match.teamB && (
          <Button onClick={handleStart} className="w-full" disabled={loading}>
            Start Match
          </Button>
        )}

        {canScore && match.status === "in_progress" && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Add Set {newSetNumber}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min={0}
                    value={teamAScore}
                    onChange={(e) =>
                      setTeamAScore(parseInt(e.target.value, 10) || 0)
                    }
                    placeholder={match.teamA?.name ?? "A"}
                  />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    min={0}
                    value={teamBScore}
                    onChange={(e) =>
                      setTeamBScore(parseInt(e.target.value, 10) || 0)
                    }
                    placeholder={match.teamB?.name ?? "B"}
                  />
                </div>
                <Button
                  onClick={handleScoreSubmit}
                  size="sm"
                  disabled={loading}
                >
                  Save
                </Button>
              </div>
            </div>

            <Separator />
            <div className="flex gap-2">
              {match.teamA && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleFinalize(match.teamA!.id)}
                  disabled={loading}
                >
                  {match.teamA.name} Wins
                </Button>
              )}
              {match.teamB && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleFinalize(match.teamB!.id)}
                  disabled={loading}
                >
                  {match.teamB.name} Wins
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
