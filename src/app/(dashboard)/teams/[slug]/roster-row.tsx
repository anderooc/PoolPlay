"use client";

/*
 * ShootSet - Collegiate club volleyball tournament hub
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { removeTeamMember } from "../actions";
import { useState } from "react";

interface Member {
  id: string;
  role: "captain" | "player";
  jerseyNumber: number | null;
  userId: string;
  fullName: string;
  email: string;
}

export function RosterRow({
  member,
  isCaptain,
  teamId,
}: {
  member: Member;
  isCaptain: boolean;
  teamId: string;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    await removeTeamMember(teamId, member.id);
    setRemoving(false);
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {member.jerseyNumber !== null ? (
            <span className="w-10 shrink-0 text-center text-lg font-bold tabular-nums text-muted-foreground">
              {member.jerseyNumber}
            </span>
          ) : (
            <span className="w-10 shrink-0 text-center text-lg font-bold text-muted-foreground/40">
              —
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <p className="font-medium leading-tight">{member.fullName}</p>
            <p className="truncate text-sm text-muted-foreground">
              {member.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Badge
            variant={member.role === "captain" ? "default" : "secondary"}
            className="capitalize"
          >
            {member.role}
          </Badge>
          {isCaptain && member.role !== "captain" ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              {removing ? "Removing…" : "Remove"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
