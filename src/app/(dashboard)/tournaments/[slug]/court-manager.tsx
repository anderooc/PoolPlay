"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { addCourt, removeCourt } from "../actions";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Court {
  id: string;
  name: string;
  /** Division names this court is assigned to (alphabetical from server) */
  divisionNames: string[];
}

export function CourtManager({
  tournamentId,
  courts,
  isOrganizer,
}: {
  tournamentId: string;
  courts: Court[];
  isOrganizer: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingCourtId, setRemovingCourtId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [highlightCourtId, setHighlightCourtId] = useState<string | null>(null);
  const [pendingAddedCourtId, setPendingAddedCourtId] = useState<string | null>(
    null
  );
  const addCourtToastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!highlightCourtId) return;
    const found = courts.some((c) => c.id === highlightCourtId);
    if (!found) return;
    // Keep highlight visible long enough for enter animation + ring pulse.
    const t = window.setTimeout(() => setHighlightCourtId(null), 1300);
    return () => window.clearTimeout(t);
  }, [courts, highlightCourtId]);

  useEffect(() => {
    if (!highlightCourtId) return;
    const t = window.setTimeout(() => setHighlightCourtId(null), 8000);
    return () => window.clearTimeout(t);
  }, [highlightCourtId]);

  useEffect(() => {
    if (pendingAddedCourtId == null || addCourtToastIdRef.current == null) return;
    const isVisible = courts.some((c) => c.id === pendingAddedCourtId);
    if (!isVisible) return;
    toast.success("Court added", { id: addCourtToastIdRef.current });
    addCourtToastIdRef.current = null;
    setPendingAddedCourtId(null);
  }, [courts, pendingAddedCourtId]);

  async function handleAdd(formData: FormData) {
    setLoading(true);
    setError(null);
    const toastId = toast.loading("Adding court...");
    addCourtToastIdRef.current = toastId;
    const result = await addCourt(tournamentId, formData);
    if (result?.error) {
      setError(result.error);
      setPendingAddedCourtId(null);
      toast.error("Could not add court", { id: toastId });
      addCourtToastIdRef.current = null;
      setLoading(false);
      return;
    }
    if ("success" in result && result.success && "id" in result) {
      setHighlightCourtId(result.id);
      setPendingAddedCourtId(result.id);
      setShowForm(false);
      startTransition(() => {
        router.refresh();
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (removingCourtId == null) return;
    const stillThere = courts.some((c) => c.id === removingCourtId);
    if (!stillThere) {
      queueMicrotask(() => setRemovingCourtId(null));
    }
  }, [courts, removingCourtId]);

  useEffect(() => {
    if (removingCourtId == null) return;
    const id = window.setTimeout(() => setRemovingCourtId(null), 12000);
    return () => window.clearTimeout(id);
  }, [removingCourtId]);

  async function handleRemove(courtId: string) {
    setRemoveError(null);
    setRemovingCourtId(courtId);
    const result = await removeCourt(tournamentId, courtId);
    if (result?.error) {
      setRemoveError(result.error);
      setRemovingCourtId(null);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  const removeBusy = removingCourtId !== null;

  return (
    <div className="space-y-4">
      {courts.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No courts added yet.</p>
            {isOrganizer && (
              <Button
                className="mt-3"
                variant="outline"
                disabled={removeBusy}
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Court
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {removeError && (
            <p className="text-sm text-destructive" role="alert">
              {removeError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {courts.map((court) => {
              const isRemoving = removingCourtId === court.id;
              const isHighlighted = highlightCourtId === court.id;
              return (
                <div
                  key={court.id}
                  data-pp-animate={isHighlighted ? "enter" : undefined}
                  style={
                    isHighlighted
                      ? {
                          animation:
                            "ui-enter-soft 460ms cubic-bezier(0.22, 1, 0.36, 1) both",
                        }
                      : undefined
                  }
                  className={cn(
                    "relative inline-flex max-w-[min(100%,18rem)] items-start gap-1 rounded-md border border-border/70 bg-transparent px-2 py-1 text-xs text-foreground transition-[box-shadow,background-color] duration-300",
                    isRemoving && "ring-1 ring-primary/25",
                    isHighlighted &&
                      "border-primary/60 bg-primary/10 shadow-sm shadow-primary/20 ring-2 ring-primary/60"
                  )}
                >
                  <span className="min-w-0 flex-1 flex flex-col gap-px">
                    <span className="font-medium leading-tight break-words">
                      {court.name}
                    </span>
                    {court.divisionNames.length > 0 && (
                      <span className="text-[0.65rem] font-normal leading-tight text-muted-foreground break-words">
                        {court.divisionNames.join(", ")}
                      </span>
                    )}
                  </span>
                  {isOrganizer && (
                    <button
                      type="button"
                      disabled={removeBusy}
                      onClick={() => void handleRemove(court.id)}
                      className="-m-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
                      aria-label={`Remove ${court.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {isRemoving && (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-background/80 p-2 backdrop-blur-[2px]"
                      style={{ animation: "ui-fade-in 180ms ease-out both" }}
                      aria-busy="true"
                      aria-live="polite"
                    >
                      <Spinner size={22} />
                      <div
                        className="relative h-0.5 w-[min(5rem,70%)] overflow-hidden rounded-full bg-muted/90"
                        aria-hidden
                      >
                        <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary [animation:division-save-bar_1.05s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isOrganizer && !showForm && (
            <Button
              variant="outline"
              size="sm"
              disabled={removeBusy}
              onClick={() => setShowForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Court
            </Button>
          )}
        </>
      )}

      {showForm && (
        <form
          action={handleAdd}
          className="relative space-y-2 overflow-hidden rounded-lg border border-border bg-card/30 p-3"
          style={{
            animation:
              "ui-enter-soft 300ms cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {loading && (
            <div
              className="absolute inset-0 z-10 flex cursor-wait flex-col items-center justify-center gap-3 bg-background/85 p-3 backdrop-blur-sm ring-1 ring-inset ring-border/40"
              style={{ animation: "ui-fade-in 180ms ease-out both" }}
              aria-busy="true"
              aria-live="polite"
            >
              <Spinner size={28} />
              <p className="text-center text-sm font-medium text-foreground drop-shadow-sm">
                Adding court…
              </p>
              <div
                className="relative h-1 w-32 max-w-[80%] overflow-hidden rounded-full bg-muted/90 shadow-sm"
                aria-hidden
              >
                <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary [animation:division-save-bar_1.05s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
          <fieldset
            disabled={loading}
            className="min-w-0 space-y-2 border-0 p-0"
          >
            <div className="flex flex-wrap items-end gap-2">
              <Input
                name="name"
                placeholder="Court 1"
                required
                className="w-48 min-w-[10rem]"
              />
              <Button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                aria-label={loading ? "Adding court" : undefined}
                className={cn(
                  "shrink-0",
                  loading
                    ? "size-10 min-h-10 min-w-10 rounded-full p-0"
                    : "min-w-[4.5rem]"
                )}
              >
                {loading ? (
                  <Spinner size={22} variant="onPrimary" />
                ) : (
                  "Add"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </fieldset>
        </form>
      )}
    </div>
  );
}
