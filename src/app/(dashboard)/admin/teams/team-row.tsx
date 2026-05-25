"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminDialogContent } from "../admin-dialog-content";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminApproveStandaloneTeam,
  adminDeleteTeam,
  adminRejectStandaloneTeam,
  adminRenameTeam,
  adminResetStandaloneTeamToPending,
} from "../actions";
import { TEAM_VERIFICATION_STATUS_LABELS } from "@/lib/constants/team";
import type { TeamVerificationStatus } from "@/types";

interface Props {
  team: {
    id: string;
    name: string;
    slug: string;
    university: string;
    schoolId: string | null;
    verificationStatus: TeamVerificationStatus;
    memberCount: number;
  };
}

export function TeamRow({ team }: Props) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [slug, setSlug] = useState(team.slug);
  const [pending, start] = useTransition();

  const [renameOpen, setRenameOpen] = useState(false);
  const [draft, setDraft] = useState(team.name);
  const [renaming, startRename] = useTransition();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, startDelete] = useTransition();

  const isStandalone = team.schoolId == null;
  const nameMatches =
    confirmText.trim() === name.trim() && confirmText.trim() !== "";

  function approve() {
    start(async () => {
      const result = await adminApproveStandaloneTeam(team.id);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success("Team approved");
      router.refresh();
    });
  }

  function reject() {
    start(async () => {
      const result = await adminRejectStandaloneTeam(team.id);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success("Team rejected");
      router.refresh();
    });
  }

  function reopen() {
    start(async () => {
      const result = await adminResetStandaloneTeamToPending(team.id);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success("Reopened for review");
      router.refresh();
    });
  }

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

  const statusVariant =
    team.verificationStatus === "verified"
      ? "default"
      : team.verificationStatus === "rejected"
        ? "destructive"
        : "secondary";

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
        <TableCell>
          <Badge variant={statusVariant} className="gap-1">
            {team.verificationStatus === "verified" && (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {TEAM_VERIFICATION_STATUS_LABELS[team.verificationStatus]}
          </Badge>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {team.memberCount}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex flex-wrap justify-end gap-1">
            {isStandalone && team.verificationStatus !== "verified" && (
              <Button
                type="button"
                size="sm"
                onClick={approve}
                disabled={pending}
              >
                Approve
              </Button>
            )}
            {isStandalone && team.verificationStatus === "pending" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reject}
                disabled={pending}
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
            )}
            {isStandalone && team.verificationStatus !== "pending" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reopen}
                disabled={pending}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen
              </Button>
            )}
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
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AdminDialogContent>
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
        </AdminDialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <AdminDialogContent>
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
        </AdminDialogContent>
      </Dialog>
    </>
  );
}
