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

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Render separate mobile and desktop trees. Visibility is CSS-only so
 * server HTML matches the client. Change either tree without touching the
 * other — this is the mobile/desktop layout split.
 */
export function ViewportSplit({
  mobile,
  desktop,
  mobileClassName,
  desktopClassName,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
  mobileClassName?: string;
  desktopClassName?: string;
}) {
  return (
    <>
      <div className={cn("md:hidden", mobileClassName)}>{mobile}</div>
      <div className={cn("hidden md:contents", desktopClassName)}>{desktop}</div>
    </>
  );
}
