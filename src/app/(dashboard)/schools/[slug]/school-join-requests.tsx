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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  approveSchoolJoinRequest,
  rejectSchoolJoinRequest,
} from "../actions";

export type PendingJoinRequest = {
  id: string;
  fullName: string;
  email: string;
  university: string | null;
};

export function SchoolJoinRequests({
  requests,
}: {
  requests: PendingJoinRequest[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setError(null);
    setBusyId(id);
    const result = await approveSchoolJoinRequest(id);
    setBusyId(null);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleReject(id: string) {
    setError(null);
    setBusyId(id);
    const result = await rejectSchoolJoinRequest(id);
    setBusyId(null);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (requests.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4" />
          Join requests ({requests.length})
        </h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          Matching school emails. Approving adds them to the master roster as
          members so captains can put them on a team.
        </p>
      </div>
      <div className="divide-y overflow-hidden rounded-lg border bg-card">
        {requests.map((request) => {
          const busy = busyId === request.id;
          return (
            <div
              key={request.id}
              className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {request.fullName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {request.email}
                  {request.university ? ` · ${request.university}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-2 sm:h-7"
                  disabled={busy}
                  onClick={() => void handleApprove(request.id)}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {busy ? "Saving…" : "Add to roster"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 sm:h-7"
                  disabled={busy}
                  onClick={() => void handleReject(request.id)}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Decline {request.fullName}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
