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

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  VOLLEYBALL_POSITIONS,
  VOLLEYBALL_POSITION_LABELS,
  VOLLEYBALL_POSITION_SHORT_LABELS,
} from "@/lib/constants/profile";
import {
  parseVolleyballPositionInput,
  VOLLEYBALL_POSITION_UNSET,
} from "@/lib/profile/volleyball-position";
import { cn } from "@/lib/utils";
import type { VolleyballPosition } from "@/types";

export function VolleyballPositionLabel({
  position,
  className,
}: {
  position: VolleyballPosition | null | undefined;
  className?: string;
}) {
  if (!position) {
    return (
      <span
        className={cn(
          "inline-block w-[4.25rem] shrink-0 text-xs text-muted-foreground/40",
          className
        )}
      >
        -
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-block w-[4.25rem] shrink-0 truncate text-xs font-medium text-muted-foreground",
        className
      )}
      title={VOLLEYBALL_POSITION_LABELS[position]}
    >
      {VOLLEYBALL_POSITION_SHORT_LABELS[position]}
    </span>
  );
}

export function VolleyballPositionField({
  position,
  playerName,
  canEdit,
  disabled,
  onSave,
}: {
  position: VolleyballPosition | null;
  playerName: string;
  canEdit: boolean;
  disabled?: boolean;
  onSave: (
    next: VolleyballPosition | null
  ) => Promise<{ error?: string } | void>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(position ?? VOLLEYBALL_POSITION_UNSET);

  if (!canEdit) {
    return <VolleyballPositionLabel position={position} />;
  }

  async function handleChange(raw: string | null) {
    const parsed = parseVolleyballPositionInput(raw);
    if (parsed === "invalid") return;
    if (parsed === position) return;
    const nextValue = parsed ?? VOLLEYBALL_POSITION_UNSET;
    setValue(nextValue);
    setSaving(true);
    const result = await onSave(parsed);
    setSaving(false);
    if (result?.error) {
      setValue(position ?? VOLLEYBALL_POSITION_UNSET);
      return;
    }
    router.refresh();
  }

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") void handleChange(next);
      }}
      disabled={disabled || saving}
    >
      <SelectTrigger
        size="sm"
        className="h-7 w-[4.75rem] px-1.5"
        aria-label={`Volleyball position for ${playerName}`}
      >
        <span className="flex-1 truncate text-left">
          {value !== VOLLEYBALL_POSITION_UNSET &&
          (VOLLEYBALL_POSITIONS as readonly string[]).includes(value)
            ? VOLLEYBALL_POSITION_SHORT_LABELS[value as VolleyballPosition]
            : "-"}
        </span>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="w-48" align="end">
        <SelectItem value={VOLLEYBALL_POSITION_UNSET}>Not set</SelectItem>
        {VOLLEYBALL_POSITIONS.map((value) => (
          <SelectItem key={value} value={value}>
            <span className="w-10 shrink-0 font-medium">
              {VOLLEYBALL_POSITION_SHORT_LABELS[value]}
            </span>
            <span className="text-muted-foreground">
              {VOLLEYBALL_POSITION_LABELS[value]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
