"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [deleting, startDelete] = useTransition();

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteTeam(teamId);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
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

      <Dialog open={open} onOpenChange={(open) => !deleting && setOpen(open)}>
        <DialogContent className="sm:max-w-md" showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{teamName}&rdquo;?</DialogTitle>
            <DialogDescription>
              This permanently removes the team, its roster, and any tournament
              registrations. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
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
              disabled={deleting}
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
