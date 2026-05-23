"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { registerTeams } from "./actions";

interface Props {
  tournamentId: string;
  /** URL-friendly identifier used for navigation back to the tournament page */
  tournamentSlug: string;
  teams: { id: string; name: string; university: string }[];
  /** Tournament organizer — copy reflects host registration */
  asHost?: boolean;
}

function teamLabel(team: { name: string; university: string }) {
  return `${team.name} (${team.university})`;
}

export function RegisterForm({
  tournamentId,
  tournamentSlug,
  teams,
  asHost = false,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allSelected =
    teams.length > 0 && teams.every((t) => selectedIds.has(t.id));
  const selectedCount = selectedIds.size;
  const selectedTeams = teams.filter((t) => selectedIds.has(t.id));

  const triggerLabel = useMemo(() => {
    if (selectedCount === 0) return "Select teams";
    if (selectedCount === 1) return teamLabel(selectedTeams[0]!);
    return `${selectedCount} teams selected`;
  }, [selectedCount, selectedTeams]);

  const submitLabel = useMemo(() => {
    if (loading) return "Registering…";
    if (selectedCount === 0) return "Register teams";
    if (selectedCount === 1) return "Register 1 team";
    return `Register ${selectedCount} teams`;
  }, [loading, selectedCount]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggleTeam(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(teams.map((t) => t.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCount === 0) {
      setError("Select at least one team");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await registerTeams(tournamentId, [...selectedIds]);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/tournaments/${tournamentSlug}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Teams</Label>
        <div ref={containerRef} className="relative">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            aria-expanded={open}
            aria-haspopup="listbox"
            className={cn(
              "h-8 w-full justify-between px-2.5 font-normal",
              selectedCount === 0 && "text-muted-foreground"
            )}
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </Button>

          {open && (
            <div
              className="absolute top-[calc(100%+4px)] left-0 z-50 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
              role="listbox"
              aria-multiselectable
              aria-label="Teams"
            >
              {teams.length > 1 && (
                <div className="flex justify-end border-b px-2 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={toggleAll}
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </Button>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto p-1">
                {teams.map((team) => {
                  const checked = selectedIds.has(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50",
                        checked && "bg-muted/40"
                      )}
                      onClick={() => toggleTeam(team.id)}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border border-input",
                          checked &&
                            "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {checked ? <Check className="size-3" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium leading-tight">
                          {team.name}
                        </span>
                        <span className="block text-muted-foreground">
                          {team.university}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {asHost
          ? "Assign divisions and pools later from the tournament dashboard."
          : "Division and pool placement is set by the tournament organizer after you register."}
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full"
        disabled={loading || selectedCount === 0}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
