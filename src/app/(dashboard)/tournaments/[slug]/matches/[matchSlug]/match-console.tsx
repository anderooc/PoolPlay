"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format as formatDate } from "date-fns";
import {
  Minus,
  Plus,
  Play,
  Timer,
  Trophy,
  MapPin,
  Clock,
  Users,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  buildMatchScoreState,
  type MatchPhase,
} from "@/lib/tournaments/match-format";
import {
  formatMatchFormatLabel,
  type MatchFormat,
} from "@/lib/labels/match-format";
import {
  warmupMinutesForFormat,
  type WarmupFormat,
} from "@/lib/labels/warmup-format";
import {
  startWarmup,
  startMatch,
  saveSetScore,
  finalizeMatch,
  reopenMatch,
} from "../actions";
import { MatchStartTimeEditor } from "../match-start-time-editor";

interface ConsoleMatch {
  id: string;
  status: string;
  scheduledTime: string | null;
  warmupStartedAt: string | null;
  startedAt: string | null;
  winnerId: string | null;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  refTeamName: string | null;
  courtName: string | null;
  sets: { setNumber: number; teamAScore: number; teamBScore: number }[];
}

interface ConsoleSettings {
  matchFormat: MatchFormat;
  setStartingScore: number;
  setTargetScore: number;
  tiebreakTargetScore: number;
  warmupFormat: WarmupFormat;
}

const SAVE_DEBOUNCE_MS = 1000;

export function MatchConsole({
  slug,
  match,
  settings,
  canControl,
  isOrganizer,
  isRefMember,
}: {
  slug: string;
  tournamentId: string;
  match: ConsoleMatch;
  settings: ConsoleSettings;
  canControl: boolean;
  isOrganizer: boolean;
  isRefMember: boolean;
}) {
  const router = useRouter();

  const phase: MatchPhase =
    match.status === "completed"
      ? "completed"
      : match.status === "in_progress"
        ? "in_progress"
        : match.warmupStartedAt
          ? "warmup"
          : "upcoming";

  const scoreState = buildMatchScoreState(
    {
      format: settings.matchFormat,
      targetScore: settings.setTargetScore,
      tiebreakTargetScore: settings.tiebreakTargetScore,
    },
    match.sets.map((s) => ({
      teamAScore: s.teamAScore,
      teamBScore: s.teamBScore,
    }))
  );

  const currentSetNumber = scoreState.currentSetNumber;
  const storedCurrent = match.sets.find(
    (s) => s.setNumber === currentSetNumber
  );
  const startingScore = settings.setStartingScore;

  const storedA = storedCurrent?.teamAScore ?? startingScore;
  const storedB = storedCurrent?.teamBScore ?? startingScore;

  const [busy, setBusy] = useState(false);

  // ── Realtime: keep spectators (and the other team) in sync ──────────────
  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sets",
          filter: `match_id=eq.${match.id}`,
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${match.id}`,
        },
        refresh
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [match.id, router]);

  // ── Warmup countdown ────────────────────────────────────────────────────
  const warmupMinutes = warmupMinutesForFormat(settings.warmupFormat);
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (phase !== "warmup") return;
    const i = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(i);
  }, [phase]);

  const warmupRemainingMs =
    match.warmupStartedAt && warmupMinutes > 0
      ? Math.max(
          0,
          new Date(match.warmupStartedAt).getTime() +
            warmupMinutes * 60_000 -
            nowTs
        )
      : 0;

  async function runLifecycle(
    fn: () => Promise<{ error?: string | null; success?: true } | undefined>
  ) {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  const teamAName = match.teamA?.name ?? "TBD";
  const teamBName = match.teamB?.name ?? "TBD";
  const hasTeams = Boolean(match.teamA && match.teamB);

  const winnerName =
    match.winnerId === match.teamA?.id
      ? teamAName
      : match.winnerId === match.teamB?.id
        ? teamBName
        : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl">
              {teamAName} <span className="text-muted-foreground">vs</span>{" "}
              {teamBName}
            </CardTitle>
            <StatusBadge
              kind="match"
              status={phase === "warmup" ? "in_progress" : match.status}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {match.courtName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {match.courtName}
              </span>
            )}
            {match.scheduledTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(new Date(match.scheduledTime), "EEE h:mm a")}
              </span>
            )}
            {match.refTeamName && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Ref: {match.refTeamName}
              </span>
            )}
            <span>
              {formatMatchFormatLabel(settings.matchFormat)} · to{" "}
              {settings.setTargetScore}
              {settings.matchFormat === "two_with_tiebreak" &&
                ` (3rd to ${settings.tiebreakTargetScore})`}
            </span>
          </div>
          {isRefMember && (
            <p className="text-xs font-medium text-info">
              You&apos;re on the working/ref team for this match — you can run
              warmup, start play, and keep score.
            </p>
          )}
          {isOrganizer && (
            <div className="self-start">
              <MatchStartTimeEditor
                matchId={match.id}
                scheduledTime={match.scheduledTime}
              />
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Match score summary */}
      <Card>
        <CardContent className="flex items-center justify-center gap-8 py-6 text-center">
          <ScoreColumn
            name={teamAName}
            value={scoreState.setsWonA}
            highlight={match.winnerId === match.teamA?.id}
          />
          <div className="text-sm text-muted-foreground">sets</div>
          <ScoreColumn
            name={teamBName}
            value={scoreState.setsWonB}
            highlight={match.winnerId === match.teamB?.id}
          />
        </CardContent>
      </Card>

      {/* Set tracker */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Set tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {scoreState.tracker.map((entry) => (
            <div
              key={entry.setNumber}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-1.5 text-sm",
                entry.current && phase !== "completed"
                  ? "bg-primary/10 ring-1 ring-primary/20"
                  : "bg-muted/40"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">Set {entry.setNumber}</span>
                <span className="text-xs text-muted-foreground">
                  to {entry.target}
                </span>
                {entry.current && phase !== "completed" && (
                  <span className="text-xs font-medium text-primary">
                    current
                  </span>
                )}
              </span>
              <span className="tabular-nums">
                <span
                  className={cn(
                    entry.complete &&
                      entry.teamAScore > entry.teamBScore &&
                      "font-semibold"
                  )}
                >
                  {entry.teamAScore}
                </span>
                {" – "}
                <span
                  className={cn(
                    entry.complete &&
                      entry.teamBScore > entry.teamAScore &&
                      "font-semibold"
                  )}
                >
                  {entry.teamBScore}
                </span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lifecycle / scorekeeper */}
      {phase === "completed" ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <Trophy className="mx-auto h-8 w-8 text-info" />
            <p className="text-lg font-semibold">
              {winnerName ? `${winnerName} wins` : "Match complete (tie)"}
            </p>
            {isOrganizer && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void runLifecycle(() => reopenMatch(match.id))}
              >
                <RotateCcw className="h-4 w-4" />
                Reopen for corrections
              </Button>
            )}
          </CardContent>
        </Card>
      ) : !canControl ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {phase === "warmup"
              ? "Warmup in progress."
              : phase === "in_progress"
                ? "Match in progress — scores update live."
                : "Waiting for the ref team or host to start the match."}
          </CardContent>
        </Card>
      ) : phase === "upcoming" ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:justify-center">
            <Button
              disabled={busy || !hasTeams}
              onClick={() => void runLifecycle(() => startWarmup(match.id))}
            >
              <Timer className="h-4 w-4" />
              Start warmup
            </Button>
            <Button
              variant="outline"
              disabled={busy || !hasTeams}
              onClick={() => void runLifecycle(() => startMatch(match.id))}
            >
              <Play className="h-4 w-4" />
              Start match
            </Button>
          </CardContent>
        </Card>
      ) : phase === "warmup" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Warmup
              </p>
              <p className="font-heading text-4xl font-bold tabular-nums">
                {formatCountdown(warmupRemainingMs)}
              </p>
              {warmupMinutes === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No warmup configured for this tournament.
                </p>
              )}
            </div>
            <Button
              disabled={busy}
              onClick={() => void runLifecycle(() => startMatch(match.id))}
            >
              <Play className="h-4 w-4" />
              Start match
            </Button>
          </CardContent>
        </Card>
      ) : (
        // in_progress + canControl → scorekeeper
        <Card>
          <Scorekeeper
            key={currentSetNumber}
            matchId={match.id}
            setNumber={currentSetNumber}
            target={scoreState.currentTarget}
            initialA={storedA}
            initialB={storedB}
            teamAName={teamAName}
            teamBName={teamBName}
          />
          <CardContent className="space-y-4 pt-0">
            <Separator />

            <div className="space-y-2">
              <p className="text-center text-xs text-muted-foreground">
                End the match early or record the result
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {match.teamA && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void runLifecycle(() =>
                        finalizeMatch(match.id, match.teamA!.id)
                      )
                    }
                  >
                    {teamAName} wins
                  </Button>
                )}
                {match.teamB && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void runLifecycle(() =>
                        finalizeMatch(match.id, match.teamB!.id)
                      )
                    }
                  >
                    {teamBName} wins
                  </Button>
                )}
                {settings.matchFormat === "best_of_2" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void runLifecycle(() => finalizeMatch(match.id, null))
                    }
                  >
                    Record tie
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Live +/-1 scorekeeper for the current set. Keyed by set number in the parent
 * so it remounts (and reseeds) whenever play advances to a new set. Debounces
 * writes so rapid taps collapse into a single save.
 */
function Scorekeeper({
  matchId,
  setNumber,
  target,
  initialA,
  initialB,
  teamAName,
  teamBName,
}: {
  matchId: string;
  setNumber: number;
  target: number;
  initialA: number;
  initialB: number;
  teamAName: string;
  teamBName: string;
}) {
  const router = useRouter();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dirtyRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        setSaving(true);
        const fd = new FormData();
        fd.set("matchId", matchId);
        fd.set("setNumber", String(setNumber));
        fd.set("teamAScore", String(a));
        fd.set("teamBScore", String(b));
        const result = await saveSetScore(fd);
        setSaving(false);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        dirtyRef.current = false;
        router.refresh();
      })();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [a, b, matchId, setNumber, router]);

  function bump(team: "a" | "b", delta: number) {
    dirtyRef.current = true;
    if (team === "a") setA((prev) => Math.max(0, prev + delta));
    else setB((prev) => Math.max(0, prev + delta));
  }

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">
          Set {setNumber} · to {target}
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {saving ? "Saving…" : "Saved"}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Stepper name={teamAName} value={a} onBump={(d) => bump("a", d)} />
          <Stepper name={teamBName} value={b} onBump={(d) => bump("b", d)} />
        </div>
      </CardContent>
    </>
  );
}

function ScoreColumn({
  name,
  value,
  highlight,
}: {
  name: string;
  value: number;
  highlight: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "font-heading text-4xl font-bold tabular-nums",
          highlight && "text-primary"
        )}
      >
        {value}
      </p>
      <p className="mt-1 max-w-[8rem] truncate text-xs text-muted-foreground">
        {name}
      </p>
    </div>
  );
}

function Stepper({
  name,
  value,
  onBump,
}: {
  name: string;
  value: number;
  onBump: (delta: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <p className="max-w-full truncate text-sm font-medium">{name}</p>
      <p className="font-heading text-5xl font-bold tabular-nums">{value}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={`Decrease ${name} score`}
          onClick={() => onBump(-1)}
          disabled={value <= 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          aria-label={`Increase ${name} score`}
          onClick={() => onBump(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
