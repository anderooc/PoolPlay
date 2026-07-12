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

import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Slightly below viewport center so dialogs clear the admin header and tabs. */
export const adminDialogContentClass =
  "top-[calc(50%+1.5rem)] sm:max-w-md";

export function AdminDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(adminDialogContentClass, className)}
      {...props}
    />
  );
}
