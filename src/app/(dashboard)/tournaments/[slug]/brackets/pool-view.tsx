"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMatchStatusLabel } from "@/lib/labels/match";
import { calculatePoolStandings } from "@/lib/utils/pool";
import { cn } from "@/lib/utils";
import { updateMatchRef } from "./actions";

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
  refTeamId: string | null;
  winnerId: string | null;
  status: string;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  ref: { id: string; name: string } | null;
  sets: MatchSet[];
}

interface Pool {
  id: string;
  name: string;
  teams: PoolTeam[];
  matches: PoolMatch[];
}

const REF_NONE_VALUE = "__none__";

export function PoolView({
  tournamentId,
  pool,
  canEditRefs,
}: {
  tournamentId: string;
  pool: Pool;
  canEditRefs: boolean;
}) {
  const router = useRouter();
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleRefChange(matchId: string, value: string) {
    const refTeamId = value === REF_NONE_VALUE ? null : value;
    setPendingMatchId(matchId);
    const result = await updateMatchRef(tournamentId, matchId, refTeamId);
    setPendingMatchId(null);
    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    }
  }
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
              <TableHead className="text-center" title="Match wins / losses">
                W-L
              </TableHead>
              <TableHead className="text-center" title="Sets won / lost">
                Sets
              </TableHead>
              <TableHead
                className="text-center"
                title="Point differential across all sets"
              >
                +/-
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((s, i) => (
              <TableRow key={s.teamId}>
                <TableCell className="font-medium">{i + 1}</TableCell>
                <TableCell>{teamNameMap.get(s.teamId) ?? "TBD"}</TableCell>
                <TableCell className="text-center tabular-nums">
                  {s.wins}-{s.losses}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {s.setsWon}-{s.setsLost}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Matches</h4>
          {pool.matches.map((match) => {
            const eligibleRefs = pool.teams.filter(
              (t) => t.id !== match.teamAId && t.id !== match.teamBId
            );
            const showRefControl =
              canEditRefs && match.status !== "completed" && eligibleRefs.length > 0;
            return (
              <div
                key={match.id}
                className="space-y-1 rounded border p-2 text-sm"
              >
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 truncate text-right",
                      match.winnerId === match.teamAId && "font-semibold"
                    )}
                  >
                    {match.teamA?.name ?? "TBD"}
                  </span>
                  <div className="flex shrink-0 items-center justify-center gap-2 px-1">
                    {match.sets.length > 0 ? (
                      match.sets.map((s, i) => (
                        <span key={i} className="text-xs text-muted-foreground">
                          {s.teamAScore}-{s.teamBScore}
                        </span>
                      ))
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {formatMatchStatusLabel(match.status)}
                      </Badge>
                    )}
                  </div>
                  <span
                    className={cn(
                      "min-w-0 truncate text-left",
                      match.winnerId === match.teamBId && "font-semibold"
                    )}
                  >
                    {match.teamB?.name ?? "TBD"}
                  </span>
                </div>
                {showRefControl ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>Ref:</span>
                    <Select
                      value={match.refTeamId ?? REF_NONE_VALUE}
                      onValueChange={(value) =>
                        void handleRefChange(match.id, String(value ?? ""))
                      }
                      disabled={pendingMatchId === match.id}
                    >
                      <SelectTrigger size="sm" className="h-7 min-w-[10rem]">
                        <SelectValue placeholder="Choose working team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={REF_NONE_VALUE}>
                          Unassigned
                        </SelectItem>
                        {eligibleRefs.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  match.ref && (
                    <p className="text-center text-xs text-muted-foreground">
                      Ref: {match.ref.name}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
