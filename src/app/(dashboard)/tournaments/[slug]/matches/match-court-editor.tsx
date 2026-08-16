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

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBracketMatchCourt } from "../brackets/actions";

const COURT_NONE_VALUE = "";

/**
 * Host control to assign a tournament court to a bracket match.
 */
export function MatchCourtEditor({
  tournamentId,
  matchId,
  courtId,
  courts,
  disabled = false,
}: {
  tournamentId: string;
  matchId: string;
  courtId: string | null;
  courts: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedCourtId, setSelectedCourtId] = useState(courtId);

  useEffect(() => {
    setSelectedCourtId(courtId);
  }, [courtId]);

  if (courts.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        Add courts in Setup
      </span>
    );
  }

  async function handleChange(value: string) {
    const next = value === COURT_NONE_VALUE ? null : value;
    const previous = selectedCourtId;
    setSelectedCourtId(next);
    const result = await updateBracketMatchCourt(tournamentId, matchId, next);
    if ("success" in result && result.success) {
      startTransition(() => router.refresh());
    } else {
      setSelectedCourtId(previous);
      toast.error(
        "error" in result ? result.error : "Could not update court"
      );
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Select
        value={selectedCourtId ?? COURT_NONE_VALUE}
        onValueChange={(value) => void handleChange(String(value ?? ""))}
        disabled={disabled || pending}
      >
        <SelectTrigger size="sm" className="h-7 min-w-[7.5rem]">
          <SelectValue placeholder="Court">
            {(v) =>
              v && v !== COURT_NONE_VALUE
                ? (courts.find((c) => c.id === v)?.name ?? "Court")
                : "Assign court"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={COURT_NONE_VALUE}>Unassigned</SelectItem>
          {courts.map((court) => (
            <SelectItem key={court.id} value={court.id}>
              {court.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
