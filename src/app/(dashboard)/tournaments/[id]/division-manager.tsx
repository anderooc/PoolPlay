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
    const result = await addDivision(tournamentId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setShowForm(false);
      setDivisionFormat("pool_to_bracket");
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

  async function handleRemove(divisionId: string) {
    if (
      !confirm(
        "Remove this division? Pools and brackets under it will be deleted."
      )
    ) {
      return;
    }
    await removeDivision(tournamentId, divisionId);
  }

  return (
    <div className="space-y-4">
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
            {divisions.map((div) => (
              <Card key={div.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{div.name}</CardTitle>
                    {isOrganizer && (
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(div)}
                          aria-label="Edit division"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemove(div.id)}
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
                      {formatLabel[div.format] ?? div.format.replace(/_/g, " ")}
                    </Badge>
                    {div.teamCap != null && (
                      <span className="text-xs text-muted-foreground">
                        Max {div.teamCap} teams
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {isOrganizer && !showForm && (
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Division
            </Button>
          )}
        </>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Division</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleAdd} className="space-y-3">
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
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Division"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
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
    </div>
  );
}
