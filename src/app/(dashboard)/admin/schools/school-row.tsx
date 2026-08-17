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
import { AdminRecordCard } from "../admin-record-card";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  layout?: "table" | "card";
}

export function SchoolRow({ school, layout = "table" }: Props) {
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

  const actions = (
    <div
      className={cn(
        "flex flex-wrap gap-1",
        layout === "card" ? "w-full" : "justify-end"
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : null}
      {school.verificationStatus !== "verified" && (
        <Button
          type="button"
          size="sm"
          variant="default"
          className={layout === "card" ? "flex-1" : undefined}
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
          className={layout === "card" ? "flex-1" : undefined}
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
          className={layout === "card" ? "flex-1" : undefined}
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
        {layout === "card" ? "Delete" : "Delete"}
      </Button>
    </div>
  );

  const nameBlock = (
    <>
      <Link
        href={`/schools/${school.slug}`}
        title={school.name}
        className="flex min-w-0 max-w-full items-center gap-1 font-medium underline-offset-4 hover:underline"
      >
        <span className="truncate">{school.name}</span>
        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
      </Link>
      <div
        className="truncate text-xs text-muted-foreground"
        title={
          school.domainHint
            ? `${school.university} @${school.domainHint}`
            : school.university
        }
      >
        {school.university}
        {school.domainHint && (
          <span className="ml-2 font-mono">@{school.domainHint}</span>
        )}
      </div>
    </>
  );

  return (
    <>
      {layout === "card" ? (
        <AdminRecordCard>
          <div className="min-w-0">{nameBlock}</div>
          <p className="truncate text-sm text-muted-foreground">
            President: {school.presidentName ?? "—"}
            {school.presidentEmail ? ` · ${school.presidentEmail}` : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
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
            <span className="text-sm text-muted-foreground tabular-nums">
              {school.officerCount} officers · {school.teamCount} teams
            </span>
          </div>
          {actions}
        </AdminRecordCard>
      ) : (
      <TableRow>
        <TableCell className="min-w-0 overflow-hidden">{nameBlock}</TableCell>
        <TableCell className="min-w-0 overflow-hidden text-muted-foreground">
          <div className="truncate" title={school.presidentName ?? undefined}>
            {school.presidentName ?? "—"}
          </div>
          {school.presidentEmail && (
            <div className="truncate text-xs" title={school.presidentEmail}>
              {school.presidentEmail}
            </div>
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {school.officerCount}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {school.teamCount}
        </TableCell>
        <TableCell className="min-w-0 overflow-hidden">
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
        <TableCell className="overflow-hidden text-right">{actions}</TableCell>
      </TableRow>
      )}

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
