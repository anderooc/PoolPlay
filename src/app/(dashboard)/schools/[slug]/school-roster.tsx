"use client";

/*
 * PoolPlay - Collegiate club volleyball tournament hub
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
import { cn } from "@/lib/utils";
import { SCHOOL_MEMBER_ROLE_LABELS } from "@/lib/constants/school";
import {
  addSchoolMember,
  removeSchoolMember,
  transferPresidency,
  updateSchoolMemberRole,
} from "../actions";
import { Crown, Star, UserPlus, X } from "lucide-react";
import type { SchoolMemberRole } from "@/types";

type RosterMember = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  role: SchoolMemberRole;
  title: string | null;
};

export function SchoolRoster({
  schoolId,
  members,
  canManage,
  canTransferPresidencyAction,
}: {
  schoolId: string;
  members: RosterMember[];
  canManage: boolean;
  canTransferPresidencyAction: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<SchoolMemberRole>("member");

  async function handleAdd(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await addSchoolMember(schoolId, formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove(membershipId: string) {
    setError(null);
    setBusyId(membershipId);
    const result = await removeSchoolMember(schoolId, membershipId);
    setBusyId(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRoleChange(
    membershipId: string,
    role: SchoolMemberRole
  ) {
    setError(null);
    setBusyId(membershipId);
    const result = await updateSchoolMemberRole(schoolId, membershipId, role);
    setBusyId(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleTransfer(membershipId: string) {
    setError(null);
    setBusyId(membershipId);
    const result = await transferPresidency(schoolId, membershipId);
    setBusyId(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const president = members.find((m) => m.role === "president");
  const officers = members.filter((m) => m.role === "officer");
  const others = members.filter((m) => m.role === "member");

  return (
    <div className="space-y-8">
      <Section
        title="President"
        helper="One per school."
        icon={<Crown className="h-4 w-4" />}
      >
        {president ? (
          <RosterRow
            member={president}
            canManage={false}
            canTransferPresidencyAction={false}
            isBusy={busyId === president.membershipId}
            onRemove={handleRemove}
            onRoleChange={handleRoleChange}
            onTransfer={handleTransfer}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No president set.</p>
        )}
      </Section>

      <Section
        title={`Officers (${officers.length})`}
        helper="Officers can add or remove members and link teams."
        icon={<Star className="h-4 w-4" />}
      >
        {officers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No officers yet. Add at least one before submitting for
            verification.
          </p>
        ) : (
          <div className="space-y-3">
            {officers.map((m) => (
              <RosterRow
                key={m.membershipId}
                member={m}
                canManage={canManage}
                canTransferPresidencyAction={canTransferPresidencyAction}
                isBusy={busyId === m.membershipId}
                onRemove={handleRemove}
                onRoleChange={handleRoleChange}
                onTransfer={handleTransfer}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title={`Members (${others.length})`}
        helper="Players and other roster members. Can be added to any team in the school."
      >
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other members yet.</p>
        ) : (
          <div className="space-y-3">
            {others.map((m) => (
              <RosterRow
                key={m.membershipId}
                member={m}
                canManage={canManage}
                canTransferPresidencyAction={canTransferPresidencyAction}
                isBusy={busyId === m.membershipId}
                onRemove={handleRemove}
                onRoleChange={handleRoleChange}
                onTransfer={handleTransfer}
              />
            ))}
          </div>
        )}
      </Section>

      {canManage && (
        <div className="rounded-xl border bg-muted/30 p-4 sm:p-5">
          <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4" />
            Add roster member
          </h3>
          <form action={handleAdd} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="email">School email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="member@school.edu"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                value={addRole}
                onChange={(e) =>
                  setAddRole(e.target.value as SchoolMemberRole)
                }
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="member">Member</option>
                <option value="officer">Officer</option>
              </select>
            </div>
            {addRole === "officer" ? (
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g. VP, Treasurer"
                  maxLength={60}
                />
              </div>
            ) : null}
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Adding…" : "Add member"}
              </Button>
            </div>
          </form>
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  helper,
  icon,
  children,
}: {
  title: string;
  helper?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        {helper ? (
          <p className="max-w-prose text-sm text-muted-foreground">{helper}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RosterRow({
  member,
  canManage,
  canTransferPresidencyAction,
  isBusy,
  onRemove,
  onRoleChange,
  onTransfer,
}: {
  member: RosterMember;
  canManage: boolean;
  canTransferPresidencyAction: boolean;
  isBusy: boolean;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: SchoolMemberRole) => void;
  onTransfer: (id: string) => void;
}) {
  const showRoleSelect = canManage && member.role !== "president";
  const showActions =
    showRoleSelect ||
    (canTransferPresidencyAction && member.role !== "president");

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        isBusy && "opacity-60"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium leading-tight">{member.fullName}</p>
            {!showRoleSelect ? (
              <Badge variant="secondary">
                {SCHOOL_MEMBER_ROLE_LABELS[member.role]}
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {member.email}
          </p>
          {member.title ? (
            <p className="text-sm text-muted-foreground">{member.title}</p>
          ) : null}
        </div>

        {showActions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[12rem] sm:items-stretch">
            {showRoleSelect ? (
              <div className="space-y-1.5">
                <Label
                  htmlFor={`role-${member.membershipId}`}
                  className="text-xs text-muted-foreground"
                >
                  Role
                </Label>
                <Select
                  value={member.role}
                  onValueChange={(v) => {
                    if (v === "officer" || v === "member") {
                      onRoleChange(member.membershipId, v);
                    }
                  }}
                  disabled={isBusy}
                >
                  <SelectTrigger
                    id={`role-${member.membershipId}`}
                    size="sm"
                    className="h-9 w-full"
                  >
                    <SelectValue placeholder="Change role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="officer">Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              {canTransferPresidencyAction && member.role !== "president" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 justify-center"
                  disabled={isBusy}
                  onClick={() => onTransfer(member.membershipId)}
                >
                  <Crown className="mr-1.5 h-3.5 w-3.5" />
                  Make president
                </Button>
              ) : null}
              {showRoleSelect ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isBusy}
                  onClick={() => onRemove(member.membershipId)}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
