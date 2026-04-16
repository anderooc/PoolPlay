"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculatePoolStandings } from "@/lib/utils/pool";

interface PoolTeam {
  id: string;
  name: string;
  university: string;
  seed: number | null;
}

interface MatchSet {
  teamAScore: number;
  teamBScore: number;
}

interface PoolMatch {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  status: string;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  sets: MatchSet[];
}

interface Pool {
  id: string;
  name: string;
  teams: PoolTeam[];
  matches: PoolMatch[];
}

export function PoolView({ pool }: { pool: Pool }) {
  const standings = calculatePoolStandings(
    pool.teams.map((t) => t.id),
    pool.matches
      .filter((m) => m.teamAId && m.teamBId)
      .map((m) => ({
        teamAId: m.teamAId!,
        teamBId: m.teamBId!,
        winnerId: m.winnerId,
        sets: m.sets,
      }))
  );

  const teamNameMap = new Map(pool.teams.map((t) => [t.id, t.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{pool.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center">W</TableHead>
              <TableHead className="text-center">L</TableHead>
              <TableHead className="text-center">+/-</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((s, i) => (
              <TableRow key={s.teamId}>
                <TableCell className="font-medium">{i + 1}</TableCell>
                <TableCell>{teamNameMap.get(s.teamId) ?? "TBD"}</TableCell>
                <TableCell className="text-center">{s.wins}</TableCell>
                <TableCell className="text-center">{s.losses}</TableCell>
                <TableCell className="text-center">
                  {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Matches</h4>
          {pool.matches.map((match) => (
            <div
              key={match.id}
              className="flex items-center justify-between rounded border p-2 text-sm"
            >
              <span
                className={
                  match.winnerId === match.teamAId ? "font-semibold" : ""
                }
              >
                {match.teamA?.name ?? "TBD"}
              </span>
              <div className="flex items-center gap-2">
                {match.sets.length > 0 ? (
                  match.sets.map((s, i) => (
                    <span key={i} className="text-xs text-muted-foreground">
                      {s.teamAScore}-{s.teamBScore}
                    </span>
                  ))
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {match.status}
                  </Badge>
                )}
              </div>
              <span
                className={
                  match.winnerId === match.teamBId ? "font-semibold" : ""
                }
              >
                {match.teamB?.name ?? "TBD"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
