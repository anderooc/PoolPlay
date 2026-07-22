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

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_SELECT_SIDE_OFFSET } from "../constants";
import { setUserRole, adminDeleteUser } from "../actions";
import type { UserRole } from "@/types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "player", label: "Player" },
  { value: "captain", label: "Captain" },
  { value: "organizer", label: "Organizer" },
  { value: "admin", label: "Admin" },
];

interface Props {
  user: {
    id: string;
    fullName: string;
    email: string;
    university: string | null;
    role: UserRole;
    createdAt: string;
  };
  isSelf: boolean;
}

export function UserRow({ user, isSelf }: Props) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [savingRole, startRoleSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onRoleChange(next: string | null) {
    if (typeof next !== "string") return;
    if (!ROLE_OPTIONS.some((o) => o.value === next)) return;
    const previous = role;
    const nextRole = next as UserRole;
    setRole(nextRole);
    startRoleSave(async () => {
      const result = await setUserRole(user.id, nextRole);
      if ("error" in result && result.error) {
        toast.error(result.error);
        setRole(previous);
      } else {
        toast.success(`Role updated to ${nextRole}`);
      }
    });
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    startDelete(async () => {
      const result = await adminDeleteUser(user.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Deleted ${user.fullName}`);
      }
      setConfirmDelete(false);
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {user.fullName}
        {isSelf && (
          <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
            you
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell className="text-muted-foreground">
        {user.university ?? "—"}
      </TableCell>
      <TableCell>
        <div className="inline-flex items-center gap-2">
          <Select value={role} onValueChange={onRoleChange} disabled={savingRole}>
            <SelectTrigger size="sm" className="w-[8.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent sideOffset={ADMIN_SELECT_SIDE_OFFSET}>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {savingRole && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant={confirmDelete ? "destructive" : "outline"}
          size="sm"
          disabled={isSelf || deleting}
          onClick={onDelete}
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          {confirmDelete ? "Confirm delete" : "Delete"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
