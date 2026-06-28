"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format as formatDate } from "date-fns";
import { ArrowUpRight, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { MatchStartTimeEditor } from "../matches/match-start-time-editor";
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
  scheduledTime: Date | string | null;
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

const REF_NONE_VALUE = "";

export function PoolView({
  tournamentId,
  slug,
  pool,
  canEditRefs,
  canEditSchedule = false,
  tiebreakCriteria,
}: {
  tournamentId: string;
  slug: string;
  pool: Pool;
  canEditRefs: boolean;
  canEditSchedule?: boolean;
  tiebreakCriteria: Array<
    "match_record" | "set_record" | "point_diff" | "head_to_head"
  >;
}) {
  const router = useRouter();
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [optimisticRefByMatchId, setOptimisticRefByMatchId] = useState<
    Map<string, string | null>
  >(() => new Map());
  const [refErrorByMatchId, setRefErrorByMatchId] = useState<
    Map<string, string>
  >(() => new Map());
  const [, startTransition] = useTransition();

  function effectiveRefTeamId(match: PoolMatch): string | null {
    if (optimisticRefByMatchId.has(match.id)) {
      return optimisticRefByMatchId.get(match.id) ?? null;
    }
    return match.refTeamId ?? null;
  }

  function wouldRefCountsBeInvalid(next: {
    matchId: string;
    refTeamId: string | null;
  }): { invalid: boolean; max: number; min: number } {
    const counts = new Map<string, number>(pool.teams.map((t) => [t.id, 0]));
    for (const m of pool.matches) {
      const refId =
        m.id === next.matchId ? next.refTeamId : effectiveRefTeamId(m);
      if (!refId) continue;
      counts.set(refId, (counts.get(refId) ?? 0) + 1);
    }
    const values = [...counts.values()];
    const max = Math.max(...values);
    const min = Math.min(...values);
    return { invalid: max - min > 1, max, min };
  }

  async function handleRefChange(matchId: string, value: string) {
    const refTeamId = value === REF_NONE_VALUE ? null : value;

    // Block saves that would make ref distribution too imbalanced.
    const check = wouldRefCountsBeInvalid({ matchId, refTeamId });
    if (check.invalid) {
      setRefErrorByMatchId((current) => {
        const next = new Map(current);
        next.set(
          matchId,
          `Ref assignments would be unbalanced (${check.max} vs ${check.min}). Keep teams within 1 ref of each other.`
        );
        return next;
      });
      return;
    }

    setRefErrorByMatchId((current) => {
      if (!current.has(matchId)) return current;
      const next = new Map(current);
      next.delete(matchId);
      return next;
    });

    setPendingMatchId(matchId);
    const result = await updateMatchRef(tournamentId, matchId, refTeamId);
    if (result.success) {
      // Update immediately so the user sees the new ref before the blocker clears.
      setOptimisticRefByMatchId((current) => {
        const next = new Map(current);
        next.set(matchId, refTeamId);
        return next;
      });
      // Let React paint at least one frame with the new label.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      startTransition(() => {
        router.refresh();
      });
    }
    setPendingMatchId(null);
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
      })),
    { criteria: tiebreakCriteria }
  );

  const teamNameMap = new Map(pool.teams.map((t) => [t.id, t.name]));
  const teamLabelMap = new Map(
    pool.teams.map((t) => [t.id, `${t.name} (${t.university})`])
  );

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
            const refTeamId = effectiveRefTeamId(match);
            const selectedRefLabel = refTeamId
              ? (teamLabelMap.get(refTeamId) ?? "Unassigned")
              : "Unassigned";
            const isUpdatingRef = pendingMatchId === match.id;
            const refError = refErrorByMatchId.get(match.id) ?? null;
            return (
              <div
                key={match.id}
                className={cn(
                  "relative space-y-1 rounded border p-2 text-sm",
                  isUpdatingRef && "opacity-70"
                )}
              >
                {isUpdatingRef && (
                  <div className="absolute inset-0 z-10 grid place-items-center rounded bg-background/40 backdrop-blur-[1px]">
                    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    {match.scheduledTime
                      ? formatDate(new Date(match.scheduledTime), "EEE h:mm a")
                      : "No start time"}
                  </span>
                  <Link
                    href={`/tournaments/${slug}/matches/${match.id}`}
                    className="flex items-center gap-0.5 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Open
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                {canEditSchedule && (
                  <div className="flex justify-start">
                    <MatchStartTimeEditor
                      matchId={match.id}
                      scheduledTime={
                        match.scheduledTime
                          ? new Date(match.scheduledTime).toISOString()
                          : null
                      }
                      triggerLabel={
                        match.scheduledTime ? "Edit time" : "Set start time"
                      }
                    />
                  </div>
                )}
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
                      <StatusBadge kind="match" status={match.status} />
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
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <span>Ref:</span>
                      <Select
                        value={refTeamId ?? REF_NONE_VALUE}
                        onValueChange={(value) =>
                          void handleRefChange(match.id, String(value ?? ""))
                        }
                        disabled={isUpdatingRef}
                      >
                        <SelectTrigger size="sm" className="h-7 min-w-[10rem]">
                          <SelectValue placeholder="Choose working team">
                            {selectedRefLabel}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={REF_NONE_VALUE}>
                            Unassigned
                          </SelectItem>
                          {eligibleRefs.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.university})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {refError && (
                      <p className="text-center text-xs text-destructive" role="alert">
                        {refError}
                      </p>
                    )}
                  </div>
                ) : (
                  match.refTeamId && (
                    <p className="text-center text-xs text-muted-foreground">
                      Ref: {teamLabelMap.get(match.refTeamId) ?? "Unassigned"}
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
