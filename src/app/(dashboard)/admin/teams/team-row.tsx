"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { adminDeleteTeam, adminRenameTeam } from "../actions";

interface Props {
  team: {
    id: string;
    name: string;
    slug: string;
    university: string;
    memberCount: number;
  };
}

export function TeamRow({ team }: Props) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [slug, setSlug] = useState(team.slug);

  const [renameOpen, setRenameOpen] = useState(false);
  const [draft, setDraft] = useState(team.name);
  const [renaming, startRename] = useTransition();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, startDelete] = useTransition();

  const nameMatches =
    confirmText.trim() === name.trim() && confirmText.trim() !== "";

  function commitRename() {
    startRename(async () => {
      const result = await adminRenameTeam(team.id, draft);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("success" in result && result.success) {
        setName(draft.trim());
        setSlug(result.slug);
        setRenameOpen(false);
        toast.success("Team renamed");
        router.refresh();
      }
    });
  }

  function commitDelete() {
    if (!nameMatches) return;
    startDelete(async () => {
      const result = await adminDeleteTeam(team.id, confirmText);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${name}"`);
      setDeleteOpen(false);
      setConfirmText("");
      router.refresh();
    });
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <Link
            href={`/teams/${slug}`}
            className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            {name}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Link>
        </TableCell>
        <TableCell className="text-muted-foreground">{team.university}</TableCell>
        <TableCell className="text-right tabular-nums">
          {team.memberCount}
        </TableCell>
        <TableCell className="text-right">
          <div className="inline-flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(name);
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
            <DialogTitle>Rename team</DialogTitle>
            <DialogDescription>
              The slug regenerates from the new name. Old team URLs won&apos;t
              redirect.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Team name"
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
              disabled={renaming || draft.trim().length === 0}
            >
              {renaming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This removes the team, its roster memberships, and any
              registrations it has in tournaments. Type the team name below to
              confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`delete-team-confirm-${team.id}`} className="sr-only">
              Team name
            </Label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
              {name}
            </p>
            <Input
              id={`delete-team-confirm-${team.id}`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type the full team name"
              disabled={deleting}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
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
              disabled={deleting || !nameMatches}
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
