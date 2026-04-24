"use client";

import { useMemo, useOptimistic, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTournamentStatus } from "../actions";
import type { TournamentStatus } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS: { value: TournamentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration open" },
  { value: "registration_closed", label: "Registration closed" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export function StatusControls({
  tournamentId,
  currentStatus,
}: {
  tournamentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [blocking, setBlocking] = useState(false);

  const value = useMemo((): TournamentStatus => {
    const v = currentStatus as TournamentStatus;
    return STATUS_OPTIONS.some((o) => o.value === v) ? v : "draft";
  }, [currentStatus]);

  const [displayStatus, setOptimisticStatus] = useOptimistic(
    value,
    (_current, next: TournamentStatus) => next
  );

  function onChange(next: TournamentStatus) {
    setBlocking(true);
    startTransition(() => {
      setOptimisticStatus(next);
    });
    void (async () => {
      try {
        const result = await updateTournamentStatus(tournamentId, next);
        if (result?.error) {
          await router.refresh();
          return;
        }
        await router.refresh();
      } catch {
        await router.refresh();
      } finally {
        setBlocking(false);
      }
    })();
  }

  return (
    <div
      className={cn(
        "relative inline-flex items-center",
        blocking && "cursor-wait"
      )}
      aria-busy={blocking}
      aria-live="polite"
    >
      <span className="sr-only">Tournament status</span>
      {/*
        key resets internal selectedIndex when the value changes so Base UI
        does not show multiple ItemIndicators (selectedIndex vs value mismatch).
      */}
      <Select
        key={`${tournamentId}-${displayStatus}`}
        value={displayStatus}
        onValueChange={(v) => {
          if (
            typeof v === "string" &&
            STATUS_OPTIONS.some((o) => o.value === v)
          ) {
            onChange(v as TournamentStatus);
          }
        }}
        disabled={blocking}
      >
        <SelectTrigger
          id="tournament-status"
          size="default"
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "relative z-0 h-8 min-w-[12.5rem] max-w-[min(100vw-2rem,18rem)] justify-between gap-2 font-medium transition-opacity duration-200",
            blocking && "pointer-events-none opacity-60"
          )}
        >
          <SelectValue>
            {(v) =>
              STATUS_OPTIONS.find((o) => o.value === v)?.label ??
              String(v ?? "")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => {
            const isCurrent = o.value === displayStatus;
            return (
              <SelectItem
                key={o.value}
                value={o.value}
                disabled={isCurrent}
                className={cn(
                  isCurrent &&
                    "cursor-default border border-primary/30 bg-primary/10 font-semibold text-foreground opacity-100"
                )}
              >
                {o.label}
                {isCurrent ? " (current)" : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {blocking && (
        <>
          <span className="sr-only">Updating tournament status…</span>
          <div
            className="pointer-events-auto absolute inset-0 z-10 flex cursor-wait items-center justify-center rounded-lg bg-background/50 backdrop-blur-[1px] ring-1 ring-inset ring-border/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
            aria-hidden
          >
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        </>
      )}
    </div>
  );
}
