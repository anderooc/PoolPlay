"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateMatchScheduledTime } from "./[matchId]/actions";

/** Convert an ISO string to a value usable by <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * Inline host control for editing a match's planned start time. Used on the
 * match page and embedded on the Pools/Bracket match rows.
 */
export function MatchStartTimeEditor({
  matchId,
  scheduledTime,
  triggerLabel = "Edit start time",
}: {
  matchId: string;
  scheduledTime: string | null;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => toLocalInput(scheduledTime));
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 rounded-md border bg-background px-2 text-sm"
      />
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const iso = value ? new Date(value).toISOString() : null;
          const result = await updateMatchScheduledTime(matchId, iso);
          setBusy(false);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Start time updated");
          setOpen(false);
          router.refresh();
        }}
      >
        Save
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => {
          setValue(toLocalInput(scheduledTime));
          setOpen(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
