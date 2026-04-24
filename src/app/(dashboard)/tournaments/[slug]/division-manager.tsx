"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, X } from "lucide-react";
import {
  addDivision,
  removeDivision,
  updateDivision,
  setCourtsForDivision,
} from "../actions";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Division {
  id: string;
  name: string;
  format: string;
  teamCap: number | null;
}

interface TournamentCourt {
  id: string;
  name: string;
  /** Divisions this court is linked to (may be several) */
  divisionIds: string[];
}

const formatLabel: Record<string, string> = {
  pool_to_bracket: "Pool Play to Bracket",
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
};

function snapshotTournamentData(
  divs: Division[],
  courts: TournamentCourt[]
) {
  return JSON.stringify({
    divisions: divs
      .map((d) => ({
        id: d.id,
        name: d.name,
        format: d.format,
        teamCap: d.teamCap,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    courts: courts
      .map((c) => ({
        id: c.id,
        divisionIds: [...c.divisionIds].sort(),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export function DivisionManager({
  tournamentId,
  divisions,
  tournamentCourts,
  isOrganizer,
}: {
  tournamentId: string;
  divisions: Division[];
  tournamentCourts: TournamentCourt[];
  isOrganizer: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [divisionFormat, setDivisionFormat] = useState("pool_to_bracket");
  const [editing, setEditing] = useState<Division | null>(null);
  const [editFormat, setEditFormat] = useState("pool_to_bracket");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [awaitingFreshProps, setAwaitingFreshProps] = useState(false);
  const preSaveSnapshotRef = useRef<string | null>(null);
  const [assignedCourtIds, setAssignedCourtIds] = useState<Set<string>>(
    () => new Set()
  );
  const [removingDivisionId, setRemovingDivisionId] = useState<string | null>(
    null
  );
  const [divisionToRemove, setDivisionToRemove] = useState<Division | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [highlightDivisionId, setHighlightDivisionId] = useState<string | null>(
    null
  );
  const [pendingAddedDivisionId, setPendingAddedDivisionId] = useState<string | null>(
    null
  );
  const addDivisionToastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!highlightDivisionId) return;
    const found = divisions.some((d) => d.id === highlightDivisionId);
    if (!found) return;
    // Keep the highlight long enough for the enter animation + ring pulse to finish.
    const t = window.setTimeout(() => setHighlightDivisionId(null), 1400);
    return () => window.clearTimeout(t);
  }, [divisions, highlightDivisionId]);

  useEffect(() => {
    if (!highlightDivisionId) return;
    const t = window.setTimeout(() => setHighlightDivisionId(null), 8000);
    return () => window.clearTimeout(t);
  }, [highlightDivisionId]);

  useEffect(() => {
    if (pendingAddedDivisionId == null || addDivisionToastIdRef.current == null) {
      return;
    }
    const isVisible = divisions.some((d) => d.id === pendingAddedDivisionId);
    if (!isVisible) return;
    toast.success("Division added", { id: addDivisionToastIdRef.current });
    addDivisionToastIdRef.current = null;
    setPendingAddedDivisionId(null);
  }, [divisions, pendingAddedDivisionId]);

  useEffect(() => {
    if (!awaitingFreshProps || preSaveSnapshotRef.current == null) return;
    const now = snapshotTournamentData(divisions, tournamentCourts);
    if (now === preSaveSnapshotRef.current) return;
    preSaveSnapshotRef.current = null;
    queueMicrotask(() => {
      setAwaitingFreshProps(false);
      setEditSubmitting(false);
      setEditing(null);
    });
  }, [divisions, tournamentCourts, awaitingFreshProps]);

  useEffect(() => {
    if (!awaitingFreshProps) return;
    const id = window.setTimeout(() => {
      preSaveSnapshotRef.current = null;
      setAwaitingFreshProps(false);
      setEditSubmitting(false);
      setEditing(null);
    }, 8000);
    return () => window.clearTimeout(id);
  }, [awaitingFreshProps]);

  useEffect(() => {
    if (removingDivisionId == null) return;
    const stillThere = divisions.some((d) => d.id === removingDivisionId);
    if (!stillThere) {
      queueMicrotask(() => setRemovingDivisionId(null));
    }
  }, [divisions, removingDivisionId]);

  useEffect(() => {
    if (removingDivisionId == null) return;
    const id = window.setTimeout(() => setRemovingDivisionId(null), 12000);
    return () => window.clearTimeout(id);
  }, [removingDivisionId]);

  function openEditDialog(div: Division) {
    setEditing(div);
    setEditFormat(div.format);
    setEditError(null);
    setAssignedCourtIds(
      new Set(
        tournamentCourts
          .filter((c) => c.divisionIds.includes(div.id))
          .map((c) => c.id)
      )
    );
  }

  async function handleAdd(formData: FormData) {
    formData.set("format", divisionFormat);
    setLoading(true);
    setError(null);
    addDivisionToastIdRef.current = toast.loading("Adding division...");
    const result = await addDivision(tournamentId, formData);
    if (result?.error) {
      setError(result.error);
      setPendingAddedDivisionId(null);
      if (addDivisionToastIdRef.current != null) {
        toast.error("Could not add division", { id: addDivisionToastIdRef.current });
        addDivisionToastIdRef.current = null;
      }
      setLoading(false);
      return;
    }
    if ("success" in result && result.success && "id" in result) {
      setHighlightDivisionId(result.id);
      setPendingAddedDivisionId(result.id);
      setShowForm(false);
      setDivisionFormat("pool_to_bracket");
      startTransition(() => {
        router.refresh();
      });
    }
    setLoading(false);
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const preSaveSnapshot = snapshotTournamentData(
      divisions,
      tournamentCourts
    );
    const formData = new FormData(e.currentTarget);
    formData.set("format", editFormat);
    setEditSubmitting(true);
    setEditError(null);
    const result = await updateDivision(tournamentId, editing.id, formData);
    if (result?.error) {
      setEditError(result.error);
      setEditSubmitting(false);
      return;
    }
    const courtResult = await setCourtsForDivision(
      tournamentId,
      editing.id,
      [...assignedCourtIds]
    );
    if (courtResult?.error) {
      setEditError(courtResult.error);
      setEditSubmitting(false);
      return;
    }
    preSaveSnapshotRef.current = preSaveSnapshot;
    setAwaitingFreshProps(true);
    startTransition(() => {
      router.refresh();
    });
  }

  function divisionNameFor(id: string | null) {
    if (!id) return null;
    return divisions.find((d) => d.id === id)?.name ?? null;
  }

  function requestRemoveDivision(division: Division) {
    if (removeBusy) return;
    setDivisionToRemove(division);
  }

  async function confirmRemoveDivision() {
    if (!divisionToRemove) return;
    const divisionId = divisionToRemove.id;
    setRemoveError(null);
    setDivisionToRemove(null);
    setRemovingDivisionId(divisionId);
    const result = await removeDivision(tournamentId, divisionId);
    if (result?.error) {
      setRemoveError(result.error);
      setRemovingDivisionId(null);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  const removeBusy = removingDivisionId !== null;

  return (
    <div className="space-y-4">
      {removeError && (
        <p className="text-sm text-destructive" role="alert">
          {removeError}
        </p>
      )}
      {divisions.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No divisions configured yet.
            </p>
            {isOrganizer && (
              <Button
                className="mt-3"
                variant="outline"
                disabled={removeBusy}
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Division
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((div) => {
              const isRemoving = removingDivisionId === div.id;
              const isHighlighted = highlightDivisionId === div.id;
              return (
                <Card
                  key={div.id}
                  data-pp-animate={isHighlighted ? "enter" : undefined}
                  style={
                    isHighlighted
                      ? {
                          animation:
                            "ui-enter-soft 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
                        }
                      : undefined
                  }
                  className={cn(
                    "relative overflow-hidden transition-[box-shadow,transform] duration-300",
                    isRemoving && "ring-1 ring-primary/25",
                    isHighlighted &&
                      "shadow-lg shadow-primary/20 ring-2 ring-primary/70"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{div.name}</CardTitle>
                      {isOrganizer && (
                        <div className="flex shrink-0 gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={removeBusy}
                            onClick={() => openEditDialog(div)}
                            aria-label="Edit division"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={removeBusy}
                            onClick={() => requestRemoveDivision(div)}
                            aria-label="Remove division"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {formatLabel[div.format] ??
                          div.format.replace(/_/g, " ")}
                      </Badge>
                      {div.teamCap != null && (
                        <span className="text-xs text-muted-foreground">
                          Max {div.teamCap} teams
                        </span>
                      )}
                    </div>
                  </CardContent>
                  {isRemoving && (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/75 p-4 backdrop-blur-[2px]"
                      style={{ animation: "ui-fade-in 180ms ease-out both" }}
                      aria-busy="true"
                      aria-live="polite"
                    >
                      <Spinner size={28} />
                      <p className="text-center text-sm font-medium text-foreground drop-shadow-sm">
                        Removing division…
                      </p>
                      <div
                        className="relative h-1 w-36 max-w-[85%] overflow-hidden rounded-full bg-muted/90 shadow-sm"
                        aria-hidden
                      >
                        <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary [animation:division-save-bar_1.05s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {isOrganizer && !showForm && (
            <Button
              variant="outline"
              disabled={removeBusy}
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Division
            </Button>
          )}
        </>
      )}

      {showForm && (
        <Card
          className="relative overflow-hidden"
          style={{
            animation:
              "ui-enter-soft 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {loading && (
            <div
              className="absolute inset-0 z-10 flex cursor-wait flex-col items-center justify-center gap-3 bg-background/85 p-4 backdrop-blur-sm ring-1 ring-inset ring-border/40"
              style={{ animation: "ui-fade-in 180ms ease-out both" }}
              aria-busy="true"
              aria-live="polite"
            >
              <Spinner size={32} />
              <p className="text-center text-sm font-medium text-foreground drop-shadow-sm">
                Adding division…
              </p>
              <div
                className="relative h-1 w-36 max-w-[85%] overflow-hidden rounded-full bg-muted/90 shadow-sm"
                aria-hidden
              >
                <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary [animation:division-save-bar_1.05s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-base">New Division</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleAdd} className="space-y-3">
              <fieldset
                disabled={loading}
                className="min-w-0 space-y-3 border-0 p-0"
              >
              <div className="space-y-1">
                <Label htmlFor="div-name">Name</Label>
                <Input
                  id="div-name"
                  name="name"
                  placeholder="Men's A"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="div-format">Format</Label>
                <Select
                  value={divisionFormat}
                  onValueChange={(value) =>
                    setDivisionFormat(value ?? "pool_to_bracket")
                  }
                >
                  <SelectTrigger id="div-format" className="w-full">
                    <SelectValue>
                      {(v) => formatLabel[v ?? ""] ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pool_to_bracket">
                      Pool Play to Bracket
                    </SelectItem>
                    <SelectItem value="single_elimination">
                      Single Elimination
                    </SelectItem>
                    <SelectItem value="double_elimination">
                      Double Elimination
                    </SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="format" value={divisionFormat} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="div-cap">Team Cap (optional)</Label>
                <Input
                  id="div-cap"
                  name="teamCap"
                  type="number"
                  placeholder="4"
                  min={2}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  aria-label={loading ? "Adding division" : undefined}
                  className={cn(
                    "shrink-0",
                    loading
                      ? "size-11 min-h-11 min-w-11 rounded-full p-0"
                      : "min-w-[8.75rem]"
                  )}
                >
                  {loading ? (
                    <Spinner size={26} variant="onPrimary" />
                  ) : (
                    "Add Division"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && editSubmitting) return;
          if (!open) {
            setEditing(null);
            setEditSubmitting(false);
            setAwaitingFreshProps(false);
            preSaveSnapshotRef.current = null;
          }
        }}
      >
        <DialogContent
          className="overflow-hidden sm:max-w-md"
          showCloseButton={!editSubmitting}
        >
          <div className="relative">
            <div
              className={cn(
                "transition-[filter] duration-200 ease-out",
                editSubmitting &&
                  "pointer-events-none select-none blur-[3px]"
              )}
            >
              <DialogHeader>
                <DialogTitle>Edit division</DialogTitle>
              </DialogHeader>
              {editing && (
                <form onSubmit={handleEditSubmit} className="space-y-3">
                  <fieldset
                    disabled={editSubmitting}
                    className="min-w-0 space-y-3 border-0 p-0"
                  >
              <div className="space-y-1">
                <Label htmlFor="edit-div-name">Name</Label>
                <Input
                  id="edit-div-name"
                  name="name"
                  defaultValue={editing.name}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-div-format">Format</Label>
                <Select
                  value={editFormat}
                  onValueChange={(v) => setEditFormat(v ?? "pool_to_bracket")}
                >
                  <SelectTrigger id="edit-div-format" className="w-full">
                    <SelectValue>
                      {(v) => formatLabel[v ?? ""] ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pool_to_bracket">
                      Pool Play to Bracket
                    </SelectItem>
                    <SelectItem value="single_elimination">
                      Single Elimination
                    </SelectItem>
                    <SelectItem value="double_elimination">
                      Double Elimination
                    </SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="format" value={editFormat} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-div-cap">Team Cap (optional)</Label>
                <Input
                  id="edit-div-cap"
                  name="teamCap"
                  type="number"
                  placeholder="4"
                  min={2}
                  defaultValue={editing.teamCap ?? ""}
                />
              </div>
              {tournamentCourts.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Courts for this division</legend>
                  <p className="text-xs text-muted-foreground">
                    Shared courts have no division here or elsewhere. A court can
                    belong to multiple divisions at once.
                  </p>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                    {tournamentCourts.map((court) => {
                      const otherLabels = court.divisionIds
                        .filter((did) => did !== editing.id)
                        .map((did) => divisionNameFor(did))
                        .filter((n): n is string => Boolean(n));
                      const otherSummary =
                        otherLabels.length > 0
                          ? otherLabels.join(", ")
                          : null;
                      return (
                        <label
                          key={court.id}
                          className="flex cursor-pointer items-start gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 shrink-0 rounded border-input"
                            checked={assignedCourtIds.has(court.id)}
                            onChange={() => {
                              setAssignedCourtIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(court.id)) next.delete(court.id);
                                else next.add(court.id);
                                return next;
                              });
                            }}
                          />
                          <span>
                            <span className="font-medium">{court.name}</span>
                            {otherSummary && (
                              <span className="block text-xs text-muted-foreground">
                                Also in: {otherSummary}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              </fieldset>
              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={editSubmitting}
                  onClick={() => {
                    setEditing(null);
                    setEditSubmitting(false);
                    setAwaitingFreshProps(false);
                    preSaveSnapshotRef.current = null;
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
                </form>
              )}
            </div>
            {editSubmitting && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-4"
                style={{ animation: "ui-fade-in 180ms ease-out both" }}
                aria-busy="true"
                aria-live="polite"
              >
                <div className="flex flex-col items-center gap-3">
                  <Spinner size={32} />
                  <p className="max-w-[16rem] text-center text-sm font-medium text-foreground drop-shadow-sm">
                    {awaitingFreshProps
                      ? "Syncing courts and divisions…"
                      : "Saving changes…"}
                  </p>
                  <div
                    className="relative h-1 w-44 max-w-[90%] overflow-hidden rounded-full bg-muted/90 shadow-sm"
                    aria-hidden
                  >
                    <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary [animation:division-save-bar_1.05s_ease-in-out_infinite]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={divisionToRemove !== null}
        onOpenChange={(open) => {
          if (!open && removingDivisionId == null) {
            setDivisionToRemove(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove division?</DialogTitle>
          </DialogHeader>
          {divisionToRemove && (
            <div className="space-y-2 text-sm">
              <p>
                This will remove <span className="font-medium">{divisionToRemove.name}</span>.
              </p>
              <p className="text-muted-foreground">
                Pools and brackets under this division will also be deleted.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={removingDivisionId !== null}
              onClick={() => setDivisionToRemove(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removingDivisionId !== null}
              onClick={() => void confirmRemoveDivision()}
            >
              Remove division
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
