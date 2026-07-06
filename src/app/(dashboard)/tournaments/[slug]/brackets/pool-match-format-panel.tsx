"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Settings2 } from "lucide-react";
import { updateTournamentMatchFormat } from "../../actions";
import {
  formatMatchFormatHint,
  formatMatchFormatLabel,
  MATCH_FORMATS,
  type MatchFormat,
} from "@/lib/labels/match-format";
import {
  formatWarmupFormatLabel,
  WARMUP_FORMATS,
  warmupMinutesForFormat,
  type WarmupFormat,
} from "@/lib/labels/warmup-format";
import {
  formatPoolTiebreakCriterionHint,
  formatPoolTiebreakCriterionLabel,
  POOL_TIEBREAK_CRITERIA,
  type PoolTiebreakCriterion,
} from "@/lib/labels/pool-tiebreak";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIE_BREAK_SHORT: Record<PoolTiebreakCriterion, string> = {
  match_record: "W-L",
  set_record: "Sets",
  point_diff: "Pts",
  head_to_head: "H2H",
};

function poolSettingsSummary({
  matchFormat,
  setStartingScore,
  setTargetScore,
  tiebreakTargetScore,
  warmupFormat,
  poolTiebreakCriteria,
}: {
  matchFormat: MatchFormat;
  setStartingScore: number;
  setTargetScore: number;
  tiebreakTargetScore: number;
  warmupFormat: WarmupFormat;
  poolTiebreakCriteria: PoolTiebreakCriterion[];
}) {
  const scoring = [
    formatMatchFormatLabel(matchFormat),
    setStartingScore > 0 ? `from ${setStartingScore}` : null,
    `to ${setTargetScore}`,
    matchFormat === "two_with_tiebreak"
      ? `TB ${tiebreakTargetScore}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const tieBreaks = poolTiebreakCriteria
    .map((c) => TIE_BREAK_SHORT[c])
    .join(" › ");

  return `${scoring} · ${formatWarmupFormatLabel(warmupFormat)} · ${tieBreaks}`;
}

export function PoolMatchFormatPanel({
  tournamentId,
  matchFormat,
  setStartingScore,
  setTargetScore,
  tiebreakTargetScore,
  warmupFormat,
  poolTiebreakCriteria,
}: {
  tournamentId: string;
  matchFormat: MatchFormat;
  setStartingScore: number;
  setTargetScore: number;
  tiebreakTargetScore: number;
  warmupFormat: WarmupFormat;
  poolTiebreakCriteria: PoolTiebreakCriterion[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftFormat, setDraftFormat] = useState<MatchFormat>(matchFormat);
  const [draftStartingScore, setDraftStartingScore] = useState(
    String(setStartingScore)
  );
  const [draftTargetScore, setDraftTargetScore] = useState(
    String(setTargetScore)
  );
  const [draftTiebreakScore, setDraftTiebreakScore] = useState(
    String(tiebreakTargetScore)
  );
  const [draftWarmupFormat, setDraftWarmupFormat] =
    useState<WarmupFormat>(warmupFormat);
  const [draftTiebreakCriteria, setDraftTiebreakCriteria] = useState<
    PoolTiebreakCriterion[]
  >(poolTiebreakCriteria);

  function resetDrafts() {
    setDraftFormat(matchFormat);
    setDraftStartingScore(String(setStartingScore));
    setDraftTargetScore(String(setTargetScore));
    setDraftTiebreakScore(String(tiebreakTargetScore));
    setDraftWarmupFormat(warmupFormat);
    setDraftTiebreakCriteria(poolTiebreakCriteria);
    setError(null);
  }

  async function handleSave() {
    const startingScore = Number(draftStartingScore);
    const targetScore = Number(draftTargetScore);
    const tiebreakScore = Number(draftTiebreakScore);
    if (
      !Number.isFinite(startingScore) ||
      !Number.isFinite(targetScore) ||
      !Number.isFinite(tiebreakScore)
    ) {
      setError("Enter valid numbers for each score");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateTournamentMatchFormat(tournamentId, {
      matchFormat: draftFormat,
      setStartingScore: startingScore,
      setTargetScore: targetScore,
      tiebreakTargetScore: tiebreakScore,
      warmupFormat: draftWarmupFormat,
      poolTiebreakCriteria: draftTiebreakCriteria,
    });
    if ("error" in result && result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setOpen(false);
    setSaving(false);
    startTransition(() => {
      router.refresh();
    });
  }

  const summary = poolSettingsSummary({
    matchFormat,
    setStartingScore,
    setTargetScore,
    tiebreakTargetScore,
    warmupFormat,
    poolTiebreakCriteria,
  });

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border/50",
          "bg-muted/20 px-2.5 py-1.5 sm:gap-3 sm:px-3 sm:py-2"
        )}
      >
        <Settings2
          className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/60 sm:block"
          aria-hidden
        />
        <p
          className="min-w-0 flex-1 truncate text-xs text-muted-foreground sm:text-sm"
          title={summary}
        >
          <span className="font-medium text-foreground">Pool settings</span>
          <span className="mx-1.5 text-border/80" aria-hidden>
            ·
          </span>
          <span>{summary}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            resetDrafts();
            setOpen(true);
          }}
        >
          Edit
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (saving && next) return;
          if (next) resetDrafts();
          else setError(null);
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
          <DialogHeader>
            <DialogTitle>Pool play settings</DialogTitle>
            <DialogDescription>
              Match format, warmup, and standings tie-breaks for pool play.
              Bracket matches always start at 0–0. Already played sets are not
              changed when you save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pool-match-format">Match format</Label>
              <Select
                value={draftFormat}
                onValueChange={(value) => setDraftFormat(value as MatchFormat)}
                disabled={saving}
              >
                <SelectTrigger id="pool-match-format" className="w-full">
                  <SelectValue placeholder="Choose a format">
                    {(v) =>
                      v
                        ? formatMatchFormatLabel(v as MatchFormat)
                        : "Choose a format"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MATCH_FORMATS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatMatchFormatLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formatMatchFormatHint(draftFormat)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pool-set-starting-score">Pool starting score</Label>
                <Input
                  id="pool-set-starting-score"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={50}
                  value={draftStartingScore}
                  onChange={(e) => setDraftStartingScore(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pool-set-target-score">Target score</Label>
                <Input
                  id="pool-set-target-score"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={50}
                  value={draftTargetScore}
                  onChange={(e) => setDraftTargetScore(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pool-set-tiebreak-score">Tiebreak target</Label>
                <Input
                  id="pool-set-tiebreak-score"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={30}
                  value={draftTiebreakScore}
                  onChange={(e) => setDraftTiebreakScore(e.target.value)}
                  disabled={saving || draftFormat !== "two_with_tiebreak"}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pool-warmup-format">Warmup before each match</Label>
              <Select
                value={draftWarmupFormat}
                onValueChange={(value) =>
                  setDraftWarmupFormat(value as WarmupFormat)
                }
                disabled={saving}
              >
                <SelectTrigger id="pool-warmup-format" className="w-full">
                  <SelectValue placeholder="Choose a warmup format">
                    {(v) =>
                      v
                        ? formatWarmupFormatLabel(v as WarmupFormat)
                        : "Choose a warmup format"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WARMUP_FORMATS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatWarmupFormatLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {warmupMinutesForFormat(draftWarmupFormat) === 0
                  ? "No warmup is reserved between matches."
                  : `Runs as timed segments on the match console and reserves ${warmupMinutesForFormat(draftWarmupFormat)} min when auto-scheduling.`}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tie-break order (standings / seeding)</Label>
              <div className="space-y-1">
                {draftTiebreakCriteria.map((c, index) => (
                  <div
                    key={c}
                    className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {index + 1}. {formatPoolTiebreakCriterionLabel(c)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPoolTiebreakCriterionHint(c)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={saving || index === 0}
                        onClick={() => {
                          setDraftTiebreakCriteria((current) => {
                            const next = [...current];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            return next;
                          });
                        }}
                        aria-label="Move criterion up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={
                          saving || index === draftTiebreakCriteria.length - 1
                        }
                        onClick={() => {
                          setDraftTiebreakCriteria((current) => {
                            const next = [...current];
                            [next[index], next[index + 1]] = [
                              next[index + 1],
                              next[index],
                            ];
                            return next;
                          });
                        }}
                        aria-label="Move criterion down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {draftTiebreakCriteria.length !== POOL_TIEBREAK_CRITERIA.length ? (
                <p className="text-xs text-muted-foreground">
                  Using a custom subset. Reset to defaults to include all
                  criteria.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() =>
                    setDraftTiebreakCriteria([...POOL_TIEBREAK_CRITERIA])
                  }
                >
                  Reset tie-break defaults
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving || draftTiebreakCriteria.length === 1}
                  onClick={() => setDraftTiebreakCriteria((c) => c.slice(0, -1))}
                >
                  Remove last criterion
                </Button>
              </div>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
