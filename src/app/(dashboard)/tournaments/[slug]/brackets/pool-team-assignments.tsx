"use client";

import {
  useMemo,
  useOptimistic,
  useState,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addTeamToPool, removeTeamFromPool } from "./actions";
import { Loader2, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

type PoolTeam = {
  id: string;
  name: string;
  university: string;
  seed: number | null;
};

type Pool = {
  id: string;
  name: string;
  teams: PoolTeam[];
  matchCount: number;
};

type EligibleTeam = { id: string; name: string; university: string };

type OptimisticAction =
  | { type: "add"; poolId: string; team: EligibleTeam }
  | { type: "remove"; poolId: string; teamId: string };

export function PoolTeamAssignments({
  tournamentId,
  pools,
  eligibleTeams,
}: {
  tournamentId: string;
  pools: Pool[];
  eligibleTeams: EligibleTeam[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);

  /** Same order as division roster (registration time, then name) — not pool insert order. */
  const divisionOrder = useMemo(() => {
    const map = new Map<string, number>();
    eligibleTeams.forEach((t, i) => map.set(t.id, i));
    return map;
  }, [eligibleTeams]);

  function sortPoolTeams(poolTeamsList: PoolTeam[]): PoolTeam[] {
    return [...poolTeamsList].sort((a, b) => {
      const oa = divisionOrder.get(a.id);
      const ob = divisionOrder.get(b.id);
      if (oa !== undefined && ob !== undefined && oa !== ob) return oa - ob;
      if (oa !== undefined && ob === undefined) return -1;
      if (oa === undefined && ob !== undefined) return 1;
      const sa = a.seed ?? 0;
      const sb = b.seed ?? 0;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }

  const [optimisticPools, patchPools] = useOptimistic(
    pools,
    (state, action: OptimisticAction) => {
      if (action.type === "add") {
        return state.map((p) =>
          p.id === action.poolId
            ? {
                ...p,
                teams: sortPoolTeams([
                  ...p.teams,
                  {
                    id: action.team.id,
                    name: action.team.name,
                    university: action.team.university,
                    seed: null,
                  },
                ]),
              }
            : p
        );
      }
      return state.map((p) =>
        p.id === action.poolId
          ? { ...p, teams: p.teams.filter((t) => t.id !== action.teamId) }
          : p
      );
    }
  );

  const assignedIds = new Set(
    optimisticPools.flatMap((p) => p.teams.map((t) => t.id))
  );

  const availableToAdd = eligibleTeams.filter((t) => !assignedIds.has(t.id));

  function runAdd(poolId: string, teamId: string) {
    const team = eligibleTeams.find((t) => t.id === teamId);
    if (!team) return;
    setError(null);
    setBlocking(true);
    startTransition(() => {
      patchPools({ type: "add", poolId, team });
    });
    void (async () => {
      try {
        const result = await addTeamToPool(tournamentId, poolId, teamId);
        if (result?.error) {
          setError(result.error);
          await router.refresh();
          return;
        }
        await router.refresh();
      } catch {
        await router.refresh();
      } finally {
        setBlocking(false);
      }
    })();
  }

  function runRemove(poolId: string, teamId: string) {
    setError(null);
    setBlocking(true);
    startTransition(() => {
      patchPools({ type: "remove", poolId, teamId });
    });
    void (async () => {
      try {
        const result = await removeTeamFromPool(tournamentId, poolId, teamId);
        if (result?.error) {
          setError(result.error);
          await router.refresh();
          return;
        }
        await router.refresh();
      } catch {
        await router.refresh();
      } finally {
        setBlocking(false);
      }
    })();
  }

  if (pools.length === 0) return null;

  return (
    <div
      className={cn("relative isolate w-full", blocking && "cursor-wait")}
      aria-busy={blocking}
      aria-live="polite"
    >
      <Card
        className={cn(
          "relative z-0 transition-opacity duration-150",
          blocking && "opacity-[0.92]"
        )}
      >
        <CardHeader>
          <CardTitle className="text-base">Pool assignments</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add or remove teams per pool. Changes are blocked while a pool has
            generated matches — regenerate pools if you need to edit.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {optimisticPools.map((pool) => (
            <div key={pool.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="font-medium">{pool.name}</p>
                {pool.matchCount > 0 && (
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    {pool.matchCount} match
                    {pool.matchCount !== 1 ? "es" : ""} — regenerate pools to
                    edit teams
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {sortPoolTeams(pool.teams).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                  >
                    <span>
                      {t.name}{" "}
                      <span className="text-muted-foreground">
                        ({t.university})
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 text-destructive hover:text-destructive"
                      disabled={blocking || pool.matchCount > 0}
                      onClick={() => runRemove(pool.id, t.id)}
                    >
                      <UserMinus className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs">Add confirmed team</Label>
                  <Select
                    key={`${pool.id}-${pool.teams.length}-${availableToAdd.length}`}
                    disabled={
                      blocking ||
                      pool.matchCount > 0 ||
                      availableToAdd.length === 0
                    }
                    onValueChange={(v) => {
                      if (typeof v === "string" && v) runAdd(pool.id, v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team to add…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToAdd.map((t) => (
                        <SelectItem key={`${pool.id}-${t.id}`} value={t.id}>
                          {t.name} ({t.university})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {blocking && (
        <>
          <span className="sr-only">Updating pool assignments…</span>
          <div
            className="pointer-events-auto absolute inset-0 z-10 flex cursor-wait items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px] ring-1 ring-inset ring-border/60 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
            aria-hidden
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </>
      )}
    </div>
  );
}
