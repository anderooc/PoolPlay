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

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-foreground/30 bg-background text-primary-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="group/cb-indicator flex items-center justify-center text-current"
      >
        <Check
          className="size-3 group-data-[indeterminate]/cb-indicator:hidden"
          strokeWidth={3}
        />
        <Minus
          className="hidden size-3 group-data-[indeterminate]/cb-indicator:block"
          strokeWidth={3}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
