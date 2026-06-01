"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  useEffect(() => {
    setDraftFormat(matchFormat);
    setDraftStartingScore(String(setStartingScore));
    setDraftTargetScore(String(setTargetScore));
    setDraftTiebreakScore(String(tiebreakTargetScore));
    setDraftWarmupFormat(warmupFormat);
    setDraftTiebreakCriteria(poolTiebreakCriteria);
  }, [
    matchFormat,
    setStartingScore,
    setTargetScore,
    tiebreakTargetScore,
    warmupFormat,
    poolTiebreakCriteria,
  ]);

  const hasChanges = useMemo(() => {
    if (draftFormat !== matchFormat) return true;
    if (draftWarmupFormat !== warmupFormat) return true;
    if (Number(draftStartingScore) !== setStartingScore) return true;
    if (Number(draftTargetScore) !== setTargetScore) return true;
    if (Number(draftTiebreakScore) !== tiebreakTargetScore) return true;
    if (draftTiebreakCriteria.length !== poolTiebreakCriteria.length)
      return true;
    return draftTiebreakCriteria.some(
      (c, i) => c !== poolTiebreakCriteria[i]
    );
  }, [
    draftFormat,
    matchFormat,
    draftWarmupFormat,
    warmupFormat,
    draftStartingScore,
    setStartingScore,
    draftTargetScore,
    setTargetScore,
    draftTiebreakScore,
    tiebreakTargetScore,
    draftTiebreakCriteria,
    poolTiebreakCriteria,
  ]);

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
    setSaving(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pool play settings</CardTitle>
        <CardDescription>
          Match format, warmup, and standings tie-breaks for this tournament.
          Already played sets are not changed when you save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pool-match-format">Match format</Label>
          <Select
            value={draftFormat}
            onValueChange={(value) => setDraftFormat(value as MatchFormat)}
            disabled={saving}
          >
            <SelectTrigger id="pool-match-format" className="w-full sm:max-w-md">
              <SelectValue placeholder="Choose a format" />
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

        <div className="grid gap-3 sm:grid-cols-3 sm:max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="pool-set-starting-score">Starting score</Label>
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
        <p className="text-xs text-muted-foreground">
          Pool play often starts at 4-4 and runs to 21. Bracket play usually
          goes 0-0 to 25.
        </p>

        <div className="space-y-2">
          <Label htmlFor="pool-warmup-format">Warmup before each match</Label>
          <Select
            value={draftWarmupFormat}
            onValueChange={(value) =>
              setDraftWarmupFormat(value as WarmupFormat)
            }
            disabled={saving}
          >
            <SelectTrigger id="pool-warmup-format" className="w-full sm:max-w-md">
              <SelectValue placeholder="Choose a warmup format" />
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
              : `Reserves ${warmupMinutesForFormat(draftWarmupFormat)} min before each match when auto-scheduling.`}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Tie-break order (standings / seeding)</Label>
          <div className="space-y-1 max-w-xl">
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
              Using a custom subset. Reset to defaults to include all criteria.
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

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !hasChanges}
        >
          {saving ? "Saving…" : "Save settings"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={resetDrafts}
          disabled={saving || !hasChanges}
        >
          Discard changes
        </Button>
      </CardFooter>
    </Card>
  );
}
