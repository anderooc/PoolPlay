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
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { parseJerseyNumber } from "@/lib/profile/jersey-number";
import { updateJerseyNumber, updateUserJerseyNumber } from "../actions";

export function JerseyNumberField({
  jerseyNumber,
  memberId,
  userId,
}: {
  jerseyNumber: number | null;
  memberId?: string;
  userId?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(
    jerseyNumber === null ? "" : String(jerseyNumber)
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = parseJerseyNumber(value);
    if (parsed === "invalid") {
      setValue(jerseyNumber === null ? "" : String(jerseyNumber));
      return;
    }
    if (parsed === jerseyNumber) return;
    setSaving(true);
    const result = memberId
      ? await updateJerseyNumber(memberId, parsed)
      : userId
        ? await updateUserJerseyNumber(userId, parsed)
        : { error: "Could not save jersey number." };
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
      setValue(jerseyNumber === null ? "" : String(jerseyNumber));
      return;
    }
    router.refresh();
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void save()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      aria-label="Jersey number"
      placeholder="—"
      className="h-7 w-11 px-1 text-center text-sm font-bold tabular-nums"
    />
  );
}
