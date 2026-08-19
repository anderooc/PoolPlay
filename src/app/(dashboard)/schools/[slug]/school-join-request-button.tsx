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
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cancelSchoolJoinRequest,
  requestToJoinSchool,
} from "../actions";

export function SchoolJoinRequestButton({
  schoolId,
  domainHint,
  pending,
}: {
  schoolId: string;
  domainHint: string;
  pending: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(pending);

  async function handleRequest() {
    setError(null);
    setBusy(true);
    const result = await requestToJoinSchool(schoolId);
    setBusy(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setIsPending(true);
    router.refresh();
  }

  async function handleCancel() {
    setError(null);
    setBusy(true);
    const result = await cancelSchoolJoinRequest(schoolId);
    setBusy(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setIsPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      {isPending ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-xs text-muted-foreground">Request pending</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void handleCancel()}
          >
            {busy ? "Cancelling…" : "Cancel request"}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void handleRequest()}
        >
          <UserPlus className="mr-1 h-4 w-4" />
          {busy ? "Sending…" : "Request to join"}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Your email matches @{domainHint}
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
