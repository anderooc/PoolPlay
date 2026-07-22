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

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
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

export function FlagRow({ flag }: Props) {
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

  return (
    <TableRow className={flag.resolvedAt ? "opacity-60" : undefined}>
      <TableCell className="text-muted-foreground">
        {relativeTime(flag.createdAt)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {flag.userName ? (
          <>
            <div className="font-medium text-foreground">{flag.userName}</div>
            <div className="text-xs">{flag.userEmail}</div>
          </>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {flag.area}
      </TableCell>
      <TableCell>
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
          {flag.blockedWord}
        </span>
      </TableCell>
      <TableCell className="max-w-[24rem] whitespace-normal break-words">
        {flag.text}
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex gap-1">
          {!flag.resolvedAt && (
            <Button
              type="button"
              variant="outline"
              size="sm"
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
      </TableCell>
    </TableRow>
  );
}
