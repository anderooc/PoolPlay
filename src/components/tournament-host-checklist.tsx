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

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { HostChecklistStep } from "@/lib/tournaments/permissions";
import { Check, ListChecks } from "lucide-react";

function ChecklistContent({ steps }: { steps: HostChecklistStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2 border-b pb-3">
        <p className="text-sm font-medium">Host checklist</p>
        <p className="text-xs text-muted-foreground">
          {doneCount}/{steps.length} complete
        </p>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-2.5 text-sm">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                step.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40 bg-background"
              )}
              aria-hidden
            >
              {step.done ? <Check className="size-2.5" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "font-medium whitespace-nowrap",
                  step.done && "text-muted-foreground line-through"
                )}
              >
                {step.label}
              </span>
              {step.hint && !step.done ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {step.hint}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

export function TournamentHostChecklist({
  steps,
  className,
}: {
  steps: HostChecklistStep[];
  className?: string;
}) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length && steps.length > 0;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "shrink-0 gap-1.5",
              !allDone && doneCount > 0 && "bg-muted",
              className
            )}
            aria-label={`Host checklist, ${doneCount} of ${steps.length} steps complete`}
          >
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Checklist</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {doneCount}/{steps.length}
            </span>
          </Button>
        }
      />
      <PopoverContent
        className="w-[32rem] max-w-[90vw] p-4"
        align="end"
        sideOffset={8}
      >
        <ChecklistContent steps={steps} />
      </PopoverContent>
    </Popover>
  );
}
