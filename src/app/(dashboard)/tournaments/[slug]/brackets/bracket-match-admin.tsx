"use client";

/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock, Loader2, MapPin, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchStartTimeEditor } from "../matches/match-start-time-editor";
import { cn } from "@/lib/utils";
import {
  eligibleBracketRefIds,
  type BracketMatchForRefs,
} from "@/lib/tournaments/bracket-refs";
import { isBracketRoundOneByeMatch } from "@/lib/utils/bracket";
import { updateBracketMatchCourt, updateMatchRef } from "./actions";

interface BracketMatchRow {
  id: string;
  slug: string;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  bracketRound: number | null;
  bracketPosition: number | null;
  refTeamId: string | null;
  courtId: string | null;
  winnerId: string | null;
  status: string;
  scheduledTime: Date | string | null;
  ref: { id: string; name: string } | null;
  courtName: string | null;
  sets: { teamAScore: number; teamBScore: number }[];
}

interface TournamentCourt {
  id: string;
  name: string;
}

interface TeamLabel {
  id: string;
  label: string;
}

const REF_NONE_VALUE = "";
const COURT_NONE_VALUE = "";

function roundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinals";
  if (round === totalRounds - 2) return "Quarterfinals";
  return `Round ${round}`;
}

function groupByRound(matches: BracketMatchRow[]): Map<number, BracketMatchRow[]> {
  const map = new Map<number, BracketMatchRow[]>();
  for (const match of matches) {
    const round = match.bracketRound ?? 1;
    const list = map.get(round) ?? [];
    list.push(match);
    map.set(round, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
  }
  return map;
}

export function BracketMatchAdmin({
  tournamentId,
  slug,
  tournamentDate,
  bracketName,
  matches,
  courts,
  teamLabels,
}: {
  tournamentId: string;
  slug: string;
  tournamentDate: string;
  bracketName: string;
  matches: BracketMatchRow[];
  courts: TournamentCourt[];
  teamLabels: TeamLabel[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [optimisticRefByMatchId, setOptimisticRefByMatchId] = useState<
    Map<string, string | null>
  >(() => new Map());
  const [optimisticCourtByMatchId, setOptimisticCourtByMatchId] = useState<
    Map<string, string | null>
  >(() => new Map());
  const [errorByMatchId, setErrorByMatchId] = useState<Map<string, string>>(
    () => new Map()
  );

  const totalRounds = useMemo(
    () => Math.max(0, ...matches.map((m) => m.bracketRound ?? 0)),
    [matches]
  );

  const forRefs: BracketMatchForRefs[] = useMemo(
    () =>
      matches
        .filter((m) => m.bracketRound != null && m.bracketPosition != null)
        .map((m) => ({
          id: m.id,
          bracketRound: m.bracketRound!,
          bracketPosition: m.bracketPosition!,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          winnerId: m.winnerId,
          status: m.status,
          courtId: optimisticCourtByMatchId.has(m.id)
            ? (optimisticCourtByMatchId.get(m.id) ?? null)
            : m.courtId,
          scheduledTime: m.scheduledTime,
        })),
    [matches, optimisticCourtByMatchId]
  );

  const playableMatches = matches.filter(
    (m) =>
      m.teamAId &&
      m.teamBId &&
      !isBracketRoundOneByeMatch({
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        bracketRound: m.bracketRound,
      })
  );

  const rounds = useMemo(
    () => groupByRound(playableMatches),
    [playableMatches]
  );

  const sortedRoundNumbers = useMemo(
    () => [...rounds.keys()].sort((a, b) => a - b),
    [rounds]
  );

  if (playableMatches.length === 0) return null;

  function effectiveRefTeamId(match: BracketMatchRow): string | null {
    if (optimisticRefByMatchId.has(match.id)) {
      return optimisticRefByMatchId.get(match.id) ?? null;
    }
    return match.refTeamId ?? null;
  }

  function effectiveCourtId(match: BracketMatchRow): string | null {
    if (optimisticCourtByMatchId.has(match.id)) {
      return optimisticCourtByMatchId.get(match.id) ?? null;
    }
    return match.courtId ?? null;
  }

  async function handleRefChange(matchId: string, value: string) {
    const refTeamId = value === REF_NONE_VALUE ? null : value;
    setPendingMatchId(matchId);
    const result = await updateMatchRef(tournamentId, matchId, refTeamId);
    if (result.success) {
      setOptimisticRefByMatchId((current) => {
        const next = new Map(current);
        next.set(matchId, refTeamId);
        return next;
      });
      setErrorByMatchId((current) => {
        if (!current.has(matchId)) return current;
        const next = new Map(current);
        next.delete(matchId);
        return next;
      });
      startTransition(() => router.refresh());
    } else if (result.error) {
      setErrorByMatchId((current) => {
        const next = new Map(current);
        next.set(matchId, result.error!);
        return next;
      });
    }
    setPendingMatchId(null);
  }

  async function handleCourtChange(matchId: string, value: string) {
    const courtId = value === COURT_NONE_VALUE ? null : value;
    setPendingMatchId(matchId);
    const result = await updateBracketMatchCourt(
      tournamentId,
      matchId,
      courtId
    );
    if (result.success) {
      setOptimisticCourtByMatchId((current) => {
        const next = new Map(current);
        next.set(matchId, courtId);
        return next;
      });
      startTransition(() => router.refresh());
    } else if (result.error) {
      setErrorByMatchId((current) => {
        const next = new Map(current);
        next.set(matchId, result.error!);
        return next;
      });
    }
    setPendingMatchId(null);
  }

  const labelById = new Map(teamLabels.map((t) => [t.id, t.label]));

  return (
    <section className="rounded-xl border border-border/70 bg-card/40 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.5)] dark:shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)]">
      <header className="border-b border-border/60 px-4 py-3 sm:px-5">
        <h3 className="font-heading text-base font-semibold tracking-tight">
          {bracketName} — schedule & refs
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Round 1 refs: bye teams or later same-court matches · Later rounds:
          previous-round losers
        </p>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        {sortedRoundNumbers.map((round) => {
          const roundMatches = rounds.get(round) ?? [];
          const isFinal = round === totalRounds;

          return (
            <div key={round} className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 font-heading text-xs font-bold uppercase tracking-wide",
                    isFinal
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/80 text-foreground/80"
                  )}
                >
                  {roundLabel(round, totalRounds)}
                </span>
                <div className="h-px min-w-0 flex-1 bg-border/60" aria-hidden />
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {roundMatches.length} match
                  {roundMatches.length === 1 ? "" : "es"}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {roundMatches.map((match) => (
                  <BracketMatchTile
                    key={match.id}
                    match={match}
                    slug={slug}
                    tournamentDate={tournamentDate}
                    courts={courts}
                    labelById={labelById}
                    forRefs={forRefs}
                    refTeamId={effectiveRefTeamId(match)}
                    courtId={effectiveCourtId(match)}
                    isUpdating={pendingMatchId === match.id}
                    error={errorByMatchId.get(match.id)}
                    onRefChange={handleRefChange}
                    onCourtChange={handleCourtChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BracketMatchTile({
  match,
  slug,
  tournamentDate,
  courts,
  labelById,
  forRefs,
  refTeamId,
  courtId,
  isUpdating,
  error,
  onRefChange,
  onCourtChange,
}: {
  match: BracketMatchRow;
  slug: string;
  tournamentDate: string;
  courts: TournamentCourt[];
  labelById: Map<string, string>;
  forRefs: BracketMatchForRefs[];
  refTeamId: string | null;
  courtId: string | null;
  isUpdating: boolean;
  error?: string;
  onRefChange: (matchId: string, value: string) => void;
  onCourtChange: (matchId: string, value: string) => void;
}) {
  const target = forRefs.find((m) => m.id === match.id);
  const eligibleRefIds = target ? eligibleBracketRefIds(target, forRefs) : [];
  const showRefControl =
    match.status !== "completed" && eligibleRefIds.length > 0;
  const live = match.status === "in_progress";
  const complete = match.status === "completed";
  const aWon = complete && match.winnerId === match.teamAId;
  const bWon = complete && match.winnerId === match.teamBId;

  return (
    <article
      className={cn(
        "relative flex w-[min(100%,17.5rem)] shrink-0 flex-col rounded-lg border bg-background/80",
        live && "border-primary/35 shadow-sm shadow-primary/5",
        complete && "border-border/50 opacity-90",
        !live && !complete && "border-border/60"
      )}
    >
      {isUpdating && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-background/50 backdrop-blur-[1px]">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <MatchStartTimeEditor
          matchId={match.id}
          scheduledTime={
            match.scheduledTime
              ? new Date(match.scheduledTime).toISOString()
              : null
          }
          tournamentDate={tournamentDate}
          triggerLabel="Set time"
        />
        <div className="flex items-center gap-1.5">
          {match.sets.length === 0 && (
            <StatusBadge kind="match" status={match.status} />
          )}
          <Link
            href={`/tournaments/${slug}/matches/${match.slug}`}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            aria-label="Open match"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="space-y-0 px-3 py-2.5">
        <MatchupLine
          name={match.teamAName}
          won={aWon}
          lost={complete && !aWon && Boolean(match.winnerId)}
          setsWon={countSetsWon(match.sets, "a")}
        />
        <div className="my-1 flex items-center gap-2">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            vs
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <MatchupLine
          name={match.teamBName}
          won={bWon}
          lost={complete && !bWon && Boolean(match.winnerId)}
          setsWon={countSetsWon(match.sets, "b")}
        />
        {match.sets.length > 0 && (
          <p className="pt-1 text-center text-[10px] tabular-nums text-muted-foreground">
            {match.sets.map((s, i) => (
              <span key={i}>
                {i > 0 ? " · " : ""}
                {s.teamAScore}-{s.teamBScore}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="mt-auto space-y-2 border-t border-border/50 bg-muted/20 px-3 py-2.5">
        <label className="flex items-center gap-2 text-xs">
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          <Select
            value={courtId ?? COURT_NONE_VALUE}
            onValueChange={(value) =>
              onCourtChange(match.id, String(value ?? ""))
            }
            disabled={isUpdating || match.status === "completed"}
          >
            <SelectTrigger size="sm" className="h-7 min-w-0 flex-1">
              <SelectValue placeholder="Court">
                {(v) =>
                  v && v !== COURT_NONE_VALUE
                    ? (courts.find((c) => c.id === v)?.name ?? "Court")
                    : "Assign court"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={COURT_NONE_VALUE}>Unassigned</SelectItem>
              {courts.map((court) => (
                <SelectItem key={court.id} value={court.id}>
                  {court.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {showRefControl ? (
          <label className="flex items-center gap-2 text-xs">
            <UserRound
              className="h-3 w-3 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <Select
              value={refTeamId ?? REF_NONE_VALUE}
              onValueChange={(value) =>
                onRefChange(match.id, String(value ?? ""))
              }
              disabled={isUpdating}
            >
              <SelectTrigger size="sm" className="h-7 min-w-0 flex-1">
                <SelectValue placeholder="Ref">
                  {(v) =>
                    v && v !== REF_NONE_VALUE
                      ? (labelById.get(v) ?? "Team")
                      : "Assign ref"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={REF_NONE_VALUE}>Unassigned</SelectItem>
                {eligibleRefIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {labelById.get(id) ?? "Team"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : match.ref ? (
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <UserRound className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">Ref: {match.ref.name}</span>
          </p>
        ) : match.status !== "completed" ? (
          <p className="flex items-center gap-1.5 text-xs italic text-muted-foreground">
            <UserRound className="h-3 w-3 shrink-0" aria-hidden />
            Ref pending
          </p>
        ) : null}

        {courtId && !match.scheduledTime && (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            Set time for same-court refs
          </p>
        )}

        {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
      </div>
    </article>
  );
}

function countSetsWon(
  sets: { teamAScore: number; teamBScore: number }[],
  side: "a" | "b"
): number {
  let n = 0;
  for (const s of sets) {
    if (side === "a" && s.teamAScore > s.teamBScore) n++;
    if (side === "b" && s.teamBScore > s.teamAScore) n++;
  }
  return n;
}

function MatchupLine({
  name,
  won,
  lost,
  setsWon,
}: {
  name: string | null;
  won: boolean;
  lost: boolean;
  setsWon: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={cn(
          "min-w-0 truncate font-heading text-sm leading-snug",
          won && "font-bold text-primary",
          lost &&
            "text-muted-foreground/60 line-through decoration-muted-foreground/40",
          !name && "italic text-muted-foreground",
          name && !won && !lost && "font-semibold text-foreground"
        )}
        title={name ?? undefined}
      >
        {name ?? "TBD"}
      </span>
      {setsWon > 0 && (
        <span
          className={cn(
            "shrink-0 font-heading text-sm font-bold tabular-nums",
            won ? "text-primary" : "text-muted-foreground"
          )}
        >
          {setsWon}
        </span>
      )}
    </div>
  );
}
