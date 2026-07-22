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

import { useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import {
  regenerateTournamentBrackets,
  updateTournamentBracketSettings,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  describeBracketTierSplit,
  validateBracketTierSettings,
} from "@/lib/tournaments/bracket-tiers";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function settingsSummary(
  bracketCount: number,
  goldTeamCount: number | null,
  silverTeamCount: number | null
): string {
  const start = "Sets start 0–0";
  if (bracketCount <= 1) return `${start} · Single bracket (all pools combine)`;
  if (bracketCount === 2) {
    return `${start} · Gold (${goldTeamCount ?? "?"} teams) · Silver (remainder) · all pools combine`;
  }
  return `${start} · Gold (${goldTeamCount ?? "?"}) · Silver (${silverTeamCount ?? "?"}) · Bronze (remainder) · all pools combine`;
}

/**
 * Tournament-level bar on the Brackets tab (mirrors Pool settings on Pools).
 * All pools feed one gold / silver / bronze structure.
 */
export function BracketSettingsPanel({
  tournamentId,
  bracketCount,
  goldTeamCount,
  silverTeamCount,
  locked,
  canRegenerate,
  regenerateBlockedReason,
  totalBracketTeams,
}: {
  tournamentId: string;
  bracketCount: number;
  goldTeamCount: number | null;
  silverTeamCount: number | null;
  /** True when brackets already have teams and structure cannot change. */
  locked: boolean;
  canRegenerate: boolean;
  regenerateBlockedReason?: string;
  /** Distinct teams in pools; used to validate tier splits. */
  totalBracketTeams: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftCount, setDraftCount] = useState(String(bracketCount));
  const [draftGold, setDraftGold] = useState(
    goldTeamCount != null ? String(goldTeamCount) : "4"
  );
  const [draftSilver, setDraftSilver] = useState(
    silverTeamCount != null ? String(silverTeamCount) : "4"
  );

  function resetDrafts() {
    setDraftCount(String(bracketCount));
    setDraftGold(goldTeamCount != null ? String(goldTeamCount) : "4");
    setDraftSilver(silverTeamCount != null ? String(silverTeamCount) : "4");
    setError(null);
  }

  async function handleSave() {
    const count = Number(draftCount);
    const gold = draftCount === "1" ? null : Number(draftGold);
    const silver = draftCount === "3" ? Number(draftSilver) : null;
    if (draftCount !== "1" && (!Number.isFinite(gold) || (gold ?? 0) < 2)) {
      setError("Gold needs at least 2 teams");
      return;
    }
    if (draftCount === "3" && (!Number.isFinite(silver) || (silver ?? 0) < 2)) {
      setError("Silver needs at least 2 teams");
      return;
    }

    if (totalBracketTeams >= 2) {
      const validation = validateBracketTierSettings(
        totalBracketTeams,
        count,
        gold,
        silver
      );
      if (!validation.ok) {
        setError(validation.error);
        return;
      }
    }

    setSaving(true);
    setError(null);
    const result = await updateTournamentBracketSettings(tournamentId, {
      bracketCount: count,
      goldTeamCount: gold,
      silverTeamCount: silver,
    });
    setSaving(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    const result = await regenerateTournamentBrackets(tournamentId);
    setRegenerating(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setConfirmRegenerateOpen(false);
    startTransition(() => router.refresh());
  }

  const summary = settingsSummary(bracketCount, goldTeamCount, silverTeamCount);
  const countNum = Number(draftCount);
  const settingsLocked = locked && !canRegenerate;
  const saveRegenerates = locked && canRegenerate;

  const draftGoldNum = countNum >= 2 ? Number(draftGold) : null;
  const draftSilverNum = countNum === 3 ? Number(draftSilver) : null;

  const tierPreview = useMemo(() => {
    if (totalBracketTeams < 2 || countNum === 1) return null;
    if (
      draftGoldNum != null &&
      (!Number.isFinite(draftGoldNum) || draftGoldNum < 2)
    ) {
      return null;
    }
    if (
      countNum === 3 &&
      draftSilverNum != null &&
      (!Number.isFinite(draftSilverNum) || draftSilverNum < 2)
    ) {
      return null;
    }

    return validateBracketTierSettings(
      totalBracketTeams,
      countNum,
      draftGoldNum,
      draftSilverNum
    );
  }, [
    totalBracketTeams,
    countNum,
    draftGoldNum,
    draftSilverNum,
  ]);

  const tierPreviewInvalid =
    tierPreview != null && !tierPreview.ok ? tierPreview.error : null;
  const tierPreviewValid =
    tierPreview != null && tierPreview.ok ? tierPreview.tiers : null;

  const goldMax =
    countNum === 2
      ? Math.max(2, totalBracketTeams - 2)
      : countNum === 3
        ? Math.max(2, totalBracketTeams - 4)
        : 64;
  const silverMax =
    countNum === 3 && Number.isFinite(draftGoldNum)
      ? Math.max(2, totalBracketTeams - (draftGoldNum as number) - 2)
      : 64;

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
          <span className="font-medium text-foreground">Bracket settings</span>
          <span className="mx-1.5 text-border/80" aria-hidden>
            ·
          </span>
          <span>{summary}</span>
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            disabled={!canRegenerate || regenerating}
            title={
              canRegenerate
                ? "Re-seed brackets from current pool standings"
                : regenerateBlockedReason
            }
            onClick={() => {
              setError(null);
              setConfirmRegenerateOpen(true);
            }}
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
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
            <DialogTitle>Bracket settings</DialogTitle>
            <DialogDescription>
              All pools combine for bracket play. Bracket sets always start at
              0–0 (pool play may use a different starting score). Choose how
              many elimination brackets to run and how many teams advance into
              gold (and silver).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {settingsLocked && (
              <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                Bracket matches have already been played. Tier settings are
                locked until bracket play finishes or is cleared.
              </p>
            )}
            {saveRegenerates && (
              <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Brackets are already seeded. Saving will clear and re-seed from
                current pool standings using your updated tier counts.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="bracket-count">Number of brackets</Label>
              <Select
                value={draftCount}
                onValueChange={(v) => {
                  if (typeof v === "string") setDraftCount(v);
                }}
                disabled={saving || settingsLocked}
              >
                <SelectTrigger id="bracket-count" className="w-full">
                  <SelectValue>
                    {(v) =>
                      v === "1"
                        ? "1 · Gold only"
                        : v === "2"
                          ? "2 · Gold and silver"
                          : v === "3"
                            ? "3 · Gold, silver, and bronze"
                            : "Choose"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 · Gold only</SelectItem>
                  <SelectItem value="2">2 · Gold and silver</SelectItem>
                  <SelectItem value="3">3 · Gold, silver, and bronze</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {countNum >= 2 && (
              <div className="space-y-2">
                <Label htmlFor="gold-team-count">Teams in gold</Label>
                <Input
                  id="gold-team-count"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={draftGold}
                  onChange={(e) => setDraftGold(digitsOnly(e.target.value))}
                  disabled={saving || settingsLocked}
                />
                <p className="text-xs text-muted-foreground">
                  Top finishers across all pools (1sts, then 2nds, and so on)
                  enter gold. Remaining teams go to silver
                  {countNum === 3 ? " or bronze" : ""}.
                  {totalBracketTeams >= 2 && countNum >= 2 && (
                    <>
                      {" "}
                      Max {goldMax} with {totalBracketTeams} teams in pools.
                    </>
                  )}
                </p>
              </div>
            )}

            {countNum === 3 && (
              <div className="space-y-2">
                <Label htmlFor="silver-team-count">Teams in silver</Label>
                <Input
                  id="silver-team-count"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={draftSilver}
                  onChange={(e) => setDraftSilver(digitsOnly(e.target.value))}
                  disabled={saving || settingsLocked}
                />
                <p className="text-xs text-muted-foreground">
                  Next-best teams after gold. Everyone else goes to bronze.
                  {totalBracketTeams >= 2 && (
                    <>
                      {" "}
                      Max {silverMax} with {totalBracketTeams} teams in pools.
                    </>
                  )}
                </p>
              </div>
            )}
            {totalBracketTeams >= 2 && countNum > 1 && (
              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  tierPreviewInvalid
                    ? "border-destructive/40 bg-destructive/5 text-destructive"
                    : "border-border/60 bg-muted/30 text-muted-foreground"
                )}
                role={tierPreviewInvalid ? "alert" : undefined}
              >
                {tierPreviewInvalid ? (
                  tierPreviewInvalid
                ) : tierPreviewValid ? (
                  <>
                    <span className="font-medium text-foreground">
                      {totalBracketTeams} teams in pools:
                    </span>{" "}
                    {describeBracketTierSplit(tierPreviewValid)}
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground">
                      {totalBracketTeams} teams
                    </span>{" "}
                    in pools — enter valid tier counts to preview the split.
                  </>
                )}
              </div>
            )}
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
              disabled={
                saving || settingsLocked || Boolean(tierPreviewInvalid)
              }
            >
              {saving
                ? "Saving…"
                : saveRegenerates
                  ? "Save & regenerate"
                  : "Save settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmRegenerateOpen}
        onOpenChange={(next) => {
          if (regenerating && next) return;
          if (!next) setError(null);
          setConfirmRegenerateOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!regenerating}>
          <DialogHeader>
            <DialogTitle>Regenerate brackets?</DialogTitle>
            <DialogDescription>
              This clears current bracket matches and re-seeds gold / silver /
              bronze from the latest pool standings and your tier settings. Use
              this after fixing pool results or changing who advances where.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Only available before any bracket match has been played. Bye
            auto-advances are reset.
          </p>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRegenerateOpen(false)}
              disabled={regenerating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={regenerating}
            >
              {regenerating ? "Regenerating…" : "Regenerate brackets"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
