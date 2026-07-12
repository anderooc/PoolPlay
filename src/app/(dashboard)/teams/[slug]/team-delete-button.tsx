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
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { deleteTeam } from "../actions";

export function TeamDeleteButton({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, startDelete] = useTransition();

  const nameMatches =
    confirmText.trim() === teamName.trim() && confirmText.trim() !== "";

  function resetDialog() {
    setConfirmText("");
  }

  function handleDelete() {
    if (!nameMatches) return;
    startDelete(async () => {
      const result = await deleteTeam(teamId, confirmText);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      resetDialog();
      router.push("/teams");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Delete team
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (deleting) return;
          setOpen(next);
          if (!next) resetDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{teamName}&rdquo;?</DialogTitle>
            <DialogDescription>
              This permanently removes the team, its roster, and any tournament
              registrations. Type the team name below to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-team-confirm" className="sr-only">
              Team name
            </Label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
              {teamName}
            </p>
            <Input
              id="delete-team-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type the full team name"
              disabled={deleting}
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nameMatches && !deleting) {
                  e.preventDefault();
                  handleDelete();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || !nameMatches}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
