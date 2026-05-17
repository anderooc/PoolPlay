"use client";

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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
              <SelectContent>
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
        <DialogContent className="sm:max-w-md">
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
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This permanently removes divisions, courts, registrations, pools,
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
        </DialogContent>
      </Dialog>
    </>
  );
}
