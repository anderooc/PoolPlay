"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { updateTournamentBracketSettings } from "./actions";
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

function settingsSummary(
  bracketCount: number,
  goldTeamCount: number | null,
  silverTeamCount: number | null
): string {
  if (bracketCount <= 1) return "Single bracket (all pools combine)";
  if (bracketCount === 2) {
    return `Gold (${goldTeamCount ?? "?"} teams) · Silver (remainder) · all pools combine`;
  }
  return `Gold (${goldTeamCount ?? "?"}) · Silver (${silverTeamCount ?? "?"}) · Bronze (remainder) · all pools combine`;
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
}: {
  tournamentId: string;
  bracketCount: number;
  goldTeamCount: number | null;
  silverTeamCount: number | null;
  /** True when brackets already have teams and structure cannot change. */
  locked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const summary = settingsSummary(bracketCount, goldTeamCount, silverTeamCount);
  const countNum = Number(draftCount);

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
            <DialogTitle>Bracket settings</DialogTitle>
            <DialogDescription>
              All pools combine for bracket play. Choose how many elimination
              brackets to run and how many teams advance into gold (and silver).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {locked && (
              <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                Bracket teams are already placed. Tier counts are locked until
                brackets are cleared.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="bracket-count">Number of brackets</Label>
              <Select
                value={draftCount}
                onValueChange={(v) => {
                  if (typeof v === "string") setDraftCount(v);
                }}
                disabled={saving || locked}
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
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={64}
                  value={draftGold}
                  onChange={(e) => setDraftGold(e.target.value)}
                  disabled={saving || locked}
                />
                <p className="text-xs text-muted-foreground">
                  Top finishers across all pools (1sts, then 2nds, and so on)
                  enter gold. Remaining teams go to silver
                  {countNum === 3 ? " or bronze" : ""}.
                </p>
              </div>
            )}

            {countNum === 3 && (
              <div className="space-y-2">
                <Label htmlFor="silver-team-count">Teams in silver</Label>
                <Input
                  id="silver-team-count"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={64}
                  value={draftSilver}
                  onChange={(e) => setDraftSilver(e.target.value)}
                  disabled={saving || locked}
                />
                <p className="text-xs text-muted-foreground">
                  Next-best teams after gold. Everyone else goes to bronze.
                </p>
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
              disabled={saving || locked}
            >
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
