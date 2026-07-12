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

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminDialogContent } from "../admin-dialog-content";
import { ADMIN_SELECT_SIDE_OFFSET } from "../constants";
import { ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteTournament,
  adminRenameTournament,
  adminUpdateTournamentStatus,
} from "../actions";
import type { TournamentStatus } from "@/types";

const STATUS_OPTIONS: { value: TournamentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration open" },
  { value: "registration_closed", label: "Registration closed" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

interface Props {
  tournament: {
    id: string;
    name: string;
    slug: string;
    status: string;
    date: string;
    location: string;
    organizerName: string | null;
    organizerEmail: string | null;
  };
}

export function TournamentRow({ tournament }: Props) {
  const router = useRouter();
  const [name, setName] = useState(tournament.name);
  const [slug, setSlug] = useState(tournament.slug);
  const [status, setStatus] = useState(tournament.status as TournamentStatus);

  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState(tournament.name);
  const [renaming, startRename] = useTransition();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const [savingStatus, startStatusSave] = useTransition();

  function onStatusChange(next: string | null) {
    if (typeof next !== "string") return;
    if (!STATUS_OPTIONS.some((o) => o.value === next)) return;
    const previous = status;
    const nextStatus = next as TournamentStatus;
    setStatus(nextStatus);
    startStatusSave(async () => {
      const result = await adminUpdateTournamentStatus(
        tournament.id,
        nextStatus
      );
      if ("error" in result && result.error) {
        toast.error(result.error);
        setStatus(previous);
      } else {
        toast.success("Status updated");
      }
    });
  }

  function commitRename() {
    startRename(async () => {
      const result = await adminRenameTournament(tournament.id, draftName);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("success" in result && result.success) {
        setName(draftName.trim());
        setSlug(result.slug);
        setRenameOpen(false);
        toast.success("Tournament renamed");
        router.refresh();
      }
    });
  }

  function commitDelete() {
    startDelete(async () => {
      const result = await adminDeleteTournament(tournament.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${name}"`);
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <Link
              href={`/tournaments/${slug}`}
              className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              {name}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">{tournament.location}</div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {tournament.date}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {tournament.organizerName ?? "—"}
          {tournament.organizerEmail && (
            <div className="text-xs">{tournament.organizerEmail}</div>
          )}
        </TableCell>
        <TableCell>
          <div className="inline-flex items-center gap-2">
            <Select
              value={status}
              onValueChange={onStatusChange}
              disabled={savingStatus}
            >
              <SelectTrigger size="sm" className="w-[12rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent sideOffset={ADMIN_SELECT_SIDE_OFFSET}>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {savingStatus && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="inline-flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraftName(name);
                setRenameOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AdminDialogContent>
          <DialogHeader>
            <DialogTitle>Rename tournament</DialogTitle>
            <DialogDescription>
              The URL slug will be regenerated. Old links won&apos;t redirect.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Tournament name"
            disabled={renaming}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              }
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={commitRename}
              disabled={renaming || draftName.trim().length === 0}
            >
              {renaming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </AdminDialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AdminDialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This permanently removes pools, courts, registrations, groups,
              brackets, scheduled matches, and scores. Teams in the system are
              not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={commitDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </AdminDialogContent>
      </Dialog>
    </>
  );
}
