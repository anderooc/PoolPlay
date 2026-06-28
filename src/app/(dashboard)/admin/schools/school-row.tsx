"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
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
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminApproveSchool,
  adminDeleteSchool,
  adminRejectSchool,
  adminResetSchoolToPending,
} from "../actions";
import type { SchoolVerificationStatus } from "@/types";

interface Props {
  school: {
    id: string;
    name: string;
    slug: string;
    university: string;
    verificationStatus: SchoolVerificationStatus;
    domainHint: string | null;
    domainMatched: boolean;
    presidentName: string | null;
    presidentEmail: string | null;
    officerCount: number;
    teamCount: number;
  };
}

export function SchoolRow({ school }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  function approve() {
    start(async () => {
      const result = await adminApproveSchool(school.id);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success("School verified");
      router.refresh();
    });
  }

  function reject() {
    start(async () => {
      const result = await adminRejectSchool(school.id);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success("School rejected");
      router.refresh();
    });
  }

  function reopen() {
    start(async () => {
      const result = await adminResetSchoolToPending(school.id);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success("Reopened for review");
      router.refresh();
    });
  }

  function commitDelete() {
    startDelete(async () => {
      const result = await adminDeleteSchool(school.id);
      if ("error" in result && result.error) toast.error(result.error);
      else {
        toast.success(`Deleted "${school.name}"`);
        setDeleteOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <TableRow>
        <TableCell className="min-w-0">
          <Link
            href={`/schools/${school.slug}`}
            className="inline-flex max-w-full items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            {school.name}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Link>
          <div className="text-xs text-muted-foreground">
            {school.university}
            {school.domainHint && (
              <span className="ml-2 font-mono">@{school.domainHint}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="min-w-0 text-muted-foreground">
          {school.presidentName ?? "—"}
          {school.presidentEmail && (
            <div className="truncate text-xs">{school.presidentEmail}</div>
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {school.officerCount}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {school.teamCount}
        </TableCell>
        <TableCell className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge
              kind="verification"
              status={school.verificationStatus}
            />
            {school.domainMatched && (
              <Badge
                variant="outline"
                className="border-success/25 bg-success/10 text-success"
              >
                Domain match
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="w-72 text-right">
          <div className="flex w-full items-center justify-end gap-2">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center"
              aria-hidden={!pending}
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </span>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {school.verificationStatus !== "verified" && (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={pending}
                  onClick={approve}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </Button>
              )}
              {school.verificationStatus === "pending" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={reject}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              )}
              {school.verificationStatus !== "pending" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={reopen}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AdminDialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{school.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This removes all roster memberships and detaches any teams that
              were linked to this school.
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
