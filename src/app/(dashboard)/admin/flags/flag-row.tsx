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

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { AdminRecordCard } from "../admin-record-card";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminDeleteFlag, adminResolveFlag } from "../actions";

interface Props {
  flag: {
    id: string;
    area: string;
    text: string;
    blockedWord: string;
    resolvedAt: string | null;
    createdAt: string;
    userEmail: string | null;
    userName: string | null;
  };
  layout?: "table" | "card";
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.round(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function FlagRow({ flag, layout = "table" }: Props) {
  const [resolving, startResolve] = useTransition();
  const [deleting, startDelete] = useTransition();

  function onResolve() {
    startResolve(async () => {
      try {
        await adminResolveFlag(flag.id);
        toast.success("Marked resolved");
      } catch {
        toast.error("Could not update flag");
      }
    });
  }

  function onDelete() {
    startDelete(async () => {
      try {
        await adminDeleteFlag(flag.id);
        toast.success("Flag removed");
      } catch {
        toast.error("Could not delete flag");
      }
    });
  }

  const actions = (
    <div className={layout === "card" ? "flex w-full gap-1" : "inline-flex gap-1"}>
      {!flag.resolvedAt && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={layout === "card" ? "flex-1" : undefined}
          onClick={onResolve}
          disabled={resolving}
        >
          {resolving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Resolve
        </Button>
      )}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className={layout === "card" ? "flex-1" : undefined}
        onClick={onDelete}
        disabled={deleting}
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Delete
      </Button>
    </div>
  );

  if (layout === "card") {
    return (
      <AdminRecordCard className={flag.resolvedAt ? "opacity-60" : undefined}>
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">
            {relativeTime(flag.createdAt)}
            {flag.userName ? ` · ${flag.userName}` : ""}
          </p>
          <p className="truncate text-xs font-mono text-muted-foreground">
            {flag.area}
          </p>
          <span className="inline-block max-w-full truncate rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
            {flag.blockedWord}
          </span>
          <p className="text-sm break-words">{flag.text}</p>
        </div>
        {actions}
      </AdminRecordCard>
    );
  }

  return (
    <TableRow className={flag.resolvedAt ? "opacity-60" : undefined}>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {relativeTime(flag.createdAt)}
      </TableCell>
      <TableCell className="min-w-0 overflow-hidden text-muted-foreground">
        {flag.userName ? (
          <>
            <div
              className="truncate font-medium text-foreground"
              title={flag.userName}
            >
              {flag.userName}
            </div>
            <div className="truncate text-xs" title={flag.userEmail ?? undefined}>
              {flag.userEmail}
            </div>
          </>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="min-w-0 overflow-hidden font-mono text-xs text-muted-foreground">
        <div className="truncate" title={flag.area}>
          {flag.area}
        </div>
      </TableCell>
      <TableCell className="min-w-0 overflow-hidden">
        <span
          className="inline-block max-w-full truncate rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive"
          title={flag.blockedWord}
        >
          {flag.blockedWord}
        </span>
      </TableCell>
      <TableCell className="min-w-0 overflow-hidden whitespace-normal">
        <p className="line-clamp-2 break-words" title={flag.text}>
          {flag.text}
        </p>
      </TableCell>
      <TableCell className="overflow-hidden text-right">{actions}</TableCell>
    </TableRow>
  );
}
