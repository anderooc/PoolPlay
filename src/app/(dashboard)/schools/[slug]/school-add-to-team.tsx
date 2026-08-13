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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SCHOOL_MEMBER_ROLE_LABELS } from "@/lib/constants/school";
import { addTeamMember } from "@/app/(dashboard)/teams/actions";
import { JerseyNumberField } from "@/app/(dashboard)/teams/[slug]/jersey-number-field";
import type { SchoolMemberRole } from "@/types";

type RosterMember = {
  userId: string;
  fullName: string;
  email: string;
  role: SchoolMemberRole;
};

type SchoolTeam = {
  id: string;
  name: string;
};

const GROUPS: {
  id: string;
  label: string;
  roles: SchoolMemberRole[];
}[] = [
  { id: "officers", label: "Officers", roles: ["president", "officer"] },
  { id: "members", label: "Members", roles: ["member"] },
];

export function SchoolAddToTeam({
  teams,
  members,
  memberships,
}: {
  teams: SchoolTeam[];
  members: RosterMember[];
  memberships: {
    id: string;
    teamId: string;
    userId: string;
    jerseyNumber: number | null;
  }[];
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [pendingJerseys, setPendingJerseys] = useState<Record<string, string>>(
    {}
  );

  const selectedTeam = teams.find((t) => t.id === teamId) ?? teams[0];
  if (!selectedTeam) return null;

  const onTeam = new Map(
    memberships
      .filter((m) => m.teamId === selectedTeam.id)
      .map((m) => [m.userId, m] as const)
  );

  const q = query.trim().toLowerCase();
  const filtered = members.filter((member) => {
    if (!q) return true;
    return (
      member.fullName.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      SCHOOL_MEMBER_ROLE_LABELS[member.role].toLowerCase().includes(q)
    );
  });

  const addable = filtered.filter((m) => !onTeam.has(m.userId));
  const allAddableSelected =
    addable.length > 0 && addable.every((m) => selected.has(m.email));
  const someAddableSelected = addable.some((m) => selected.has(m.email));

  function toggleEmail(email: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(email);
      else next.delete(email);
      return next;
    });
  }

  function toggleAllAddable(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const member of addable) {
        if (checked) next.add(member.email);
        else next.delete(member.email);
      }
      return next;
    });
  }

  async function handleAddSelected() {
    const emails = [...selected].filter((email) => {
      const member = members.find((m) => m.email === email);
      return member && !onTeam.has(member.userId);
    });
    if (emails.length === 0) return;

    setLoading(true);
    setError(null);
    setAddedCount(0);

    let succeeded = 0;
    let lastError: string | null = null;

    for (const email of emails) {
      const formData = new FormData();
      formData.set("email", email);
      const jersey = pendingJerseys[email]?.trim();
      if (jersey) formData.set("jerseyNumber", jersey);
      const result = await addTeamMember(selectedTeam.id, formData);
      if (result?.error) {
        lastError = result.error;
        break;
      }
      succeeded += 1;
    }

    setLoading(false);
    if (succeeded > 0) {
      setAddedCount(succeeded);
      setSelected(new Set());
      setPendingJerseys({});
      router.refresh();
    }
    if (lastError) {
      setError(
        succeeded > 0
          ? `Added ${succeeded}, then stopped: ${lastError}`
          : lastError
      );
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-sm font-semibold">Add from school roster</h3>
        <p className="text-sm text-muted-foreground">
          Select a team, then check officers and members to add them to that
          roster.
        </p>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <Label htmlFor="add-to-team">Team</Label>
          <select
            id="add-to-team"
            value={selectedTeam.id}
            onChange={(e) => {
              setTeamId(e.target.value);
              setSelected(new Set());
              setPendingJerseys({});
              setError(null);
              setAddedCount(0);
            }}
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="roster-search">Search roster</Label>
          <Input
            id="roster-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, or role"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="max-h-[28rem] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 w-10 py-0">
                  <Checkbox
                    checked={allAddableSelected}
                    indeterminate={someAddableSelected && !allAddableSelected}
                    disabled={addable.length === 0}
                    onCheckedChange={(checked) =>
                      toggleAllAddable(checked === true)
                    }
                    aria-label="Select all available players"
                  />
                </TableHead>
                <TableHead className="h-8 py-0">Name</TableHead>
                <TableHead className="h-8 py-0">Email</TableHead>
                <TableHead className="h-8 w-16 py-0">#</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-12 text-center text-muted-foreground"
                  >
                    {members.length === 0
                      ? "No one is on the school roster yet."
                      : `No roster members match “${query.trim()}”.`}
                  </TableCell>
                </TableRow>
              ) : (
                GROUPS.flatMap((group) => {
                  const rows = filtered.filter((m) =>
                    group.roles.includes(m.role)
                  );
                  if (rows.length === 0) return [];
                  return [
                    <TableRow
                      key={`group-${group.id}`}
                      className="hover:bg-transparent"
                    >
                      <TableCell
                        colSpan={4}
                        className="bg-muted/50 py-1.5 text-xs font-medium text-muted-foreground"
                      >
                        {group.label} ({rows.length})
                      </TableCell>
                    </TableRow>,
                    ...rows.map((member) => {
                      const teamMembership = onTeam.get(member.userId);
                      const alreadyOnTeam = Boolean(teamMembership);
                      const isChecked = selected.has(member.email);
                      return (
                        <TableRow
                          key={member.userId}
                          data-state={isChecked ? "selected" : undefined}
                          className={cn(
                            !alreadyOnTeam && "cursor-pointer",
                            isChecked && "bg-muted/40"
                          )}
                          onClick={() => {
                            if (!alreadyOnTeam) {
                              toggleEmail(member.email, !isChecked);
                            }
                          }}
                        >
                          <TableCell
                            className="w-10 py-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isChecked}
                              disabled={alreadyOnTeam}
                              onCheckedChange={(checked) =>
                                toggleEmail(member.email, checked === true)
                              }
                              aria-label={`Select ${member.fullName}`}
                            />
                          </TableCell>
                          <TableCell className="max-w-[12rem] py-1.5 font-medium">
                            <span className="block truncate text-sm leading-tight">
                              {member.fullName}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[14rem] py-1.5 text-muted-foreground">
                            <span className="block truncate text-xs">
                              {member.email}
                            </span>
                          </TableCell>
                          <TableCell
                            className="w-16 py-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {teamMembership ? (
                              <JerseyNumberField
                                key={`${teamMembership.id}-${teamMembership.jerseyNumber ?? "none"}`}
                                memberId={teamMembership.id}
                                jerseyNumber={teamMembership.jerseyNumber}
                              />
                            ) : (
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={2}
                                value={pendingJerseys[member.email] ?? ""}
                                onChange={(e) =>
                                  setPendingJerseys((prev) => ({
                                    ...prev,
                                    [member.email]: e.target.value,
                                  }))
                                }
                                aria-label={`Jersey number for ${member.fullName}`}
                                placeholder="—"
                                className="h-7 w-11 px-1 text-center text-sm font-bold tabular-nums"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }),
                  ];
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-3 border-t bg-muted/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {addable.length} available for {selectedTeam.name}
            {selected.size > 0 ? ` · ${selected.size} selected` : ""}
          </p>
          <Button
            type="button"
            disabled={loading || selected.size === 0}
            onClick={handleAddSelected}
            className="w-full sm:w-auto"
          >
            {loading
              ? "Adding…"
              : selected.size > 1
                ? `Add ${selected.size} to ${selectedTeam.name}`
                : `Add to ${selectedTeam.name}`}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {addedCount > 0 && !error ? (
        <p className="mt-3 text-sm text-success">
          {addedCount === 1
            ? "Player added!"
            : `${addedCount} players added!`}
        </p>
      ) : null}
    </div>
  );
}
