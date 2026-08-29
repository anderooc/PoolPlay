"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
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

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MatchRefCrewState } from "@/lib/tournaments/match-ref-crew";
import { MATCH_REF_CREW_ROLE_LABELS } from "@/lib/tournaments/match-ref-crew";
import type { MatchRefCrewRole } from "@/lib/tournaments/match-ref-crew";
import {
  claimPointKeeper,
  claimRefCrewSlot,
  releasePointKeeper,
  releaseRefCrewSlot,
} from "../actions";

export function MatchRefCrewPanel({
  matchId,
  crew,
  canClaimCrewSlot,
  canBecomePointKeeper,
  isOrganizer,
  busy,
  onBusyChange,
}: {
  matchId: string;
  crew: MatchRefCrewState;
  canClaimCrewSlot: boolean;
  canBecomePointKeeper: boolean;
  isOrganizer: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();

  async function run(
    fn: () => Promise<{ error?: string | null; success?: true } | undefined>
  ) {
    onBusyChange(true);
    const result = await fn();
    onBusyChange(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  const showPanel =
    canClaimCrewSlot ||
    isOrganizer ||
    crew.viewerSlot != null ||
    crew.pointKeeperUserId != null ||
    crew.slots.some((slot) => slot.userId != null);

  if (!showPanel) return null;

  const missingLabels = crew.missingRequiredRoles.map(
    (role) => MATCH_REF_CREW_ROLE_LABELS[role]
  );

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardCheck className="h-4 w-4" />
          Ref crew check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!crew.isCrewComplete ? (
          <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Crew incomplete — still need: {missingLabels.join(", ")}.
            </span>
          </div>
        ) : null}

        {crew.pointKeeperFullName ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Point keeper: </span>
            <span className="font-medium">{crew.pointKeeperFullName}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No point keeper yet — a scorekeeper must claim that role to run
            scoring.
          </p>
        )}

        <ul className="space-y-1.5">
          {crew.slots.map((slot) => {
            const open = slot.userId == null;
            const mine = crew.viewerSlot === slot.role;
            return (
              <li
                key={slot.role}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                  mine && "bg-primary/10 ring-1 ring-primary/20"
                )}
              >
                <div className="min-w-0">
                  <span className="font-medium">{slot.label}</span>
                  {slot.required ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      required
                    </span>
                  ) : null}
                  <p className="truncate text-xs text-muted-foreground">
                    {slot.fullName ?? (open ? "Open" : "—")}
                  </p>
                </div>
                {canClaimCrewSlot && open && !crew.viewerSlot ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        claimRefCrewSlot(matchId, slot.role as MatchRefCrewRole)
                      )
                    }
                  >
                    Claim
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          {crew.viewerSlot ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => releaseRefCrewSlot(matchId))}
            >
              Release my slot
            </Button>
          ) : null}
          {canBecomePointKeeper ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void run(() => claimPointKeeper(matchId))}
            >
              I&apos;m keeping points
            </Button>
          ) : null}
          {crew.viewerIsPointKeeper ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => releasePointKeeper(matchId))}
            >
              Step down as point keeper
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
