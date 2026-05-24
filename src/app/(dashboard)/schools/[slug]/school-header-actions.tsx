"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut, MoreVertical, Settings, Trash2 } from "lucide-react";
import { deleteSchool, leaveSchool } from "../actions";
import {
  SchoolSettingsDialog,
  type SchoolSettingsDefaults,
} from "./school-settings";

type DialogKind = "delete" | "leave" | null;

export function SchoolHeaderActions({
  schoolId,
  schoolName,
  canManage,
  canDelete,
  canLeave,
  settingsDefaults,
}: {
  schoolId: string;
  schoolName: string;
  canManage: boolean;
  canDelete: boolean;
  canLeave: boolean;
  settingsDefaults: SchoolSettingsDefaults;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<DialogKind>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage && !canDelete && !canLeave) return null;

  async function handleDelete() {
    setError(null);
    setBusy(true);
    const result = await deleteSchool(schoolId);
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(null);
    router.replace("/schools");
    router.refresh();
  }

  async function handleLeave() {
    setError(null);
    setBusy(true);
    const result = await leaveSchool(schoolId);
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(null);
    router.replace("/schools");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0"
              aria-label="School options"
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canManage && (
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="size-4" />
                Edit school details
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
          {(canManage && (canLeave || canDelete)) && (
            <DropdownMenuSeparator />
          )}
          {(canLeave || canDelete) && (
            <DropdownMenuGroup>
              {canLeave && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setError(null);
                    setOpen("leave");
                  }}
                >
                  <LogOut className="size-4" />
                  Leave school
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => {
                    setError(null);
                    setOpen("delete");
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete school
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canManage && (
        <SchoolSettingsDialog
          schoolId={schoolId}
          defaults={settingsDefaults}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}

      <Dialog
        open={open === "delete"}
        onOpenChange={(o) => setOpen(o ? "delete" : null)}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{schoolName}&rdquo;?</DialogTitle>
            <DialogDescription>
              Roster memberships will be removed and existing teams will become
              standalone. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete school"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={open === "leave"}
        onOpenChange={(o) => setOpen(o ? "leave" : null)}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Leave {schoolName}?</DialogTitle>
            <DialogDescription>
              You&apos;ll be removed from the school&apos;s roster. You can
              join another school or create your own afterwards.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLeave}
              disabled={busy}
            >
              {busy ? "Leaving…" : "Leave school"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
