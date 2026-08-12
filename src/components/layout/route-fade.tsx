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

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Keys page content on the current pathname so every client-side
 * navigation re-mounts the inner node and replays the enter animation.
 * Keeps the transition short + consistent regardless of whether the
 * target route renders instantly or takes time to stream in.
 */
export function RouteFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <div
      key={isAdmin ? "admin" : pathname}
      className="min-h-full motion-reduce:!animate-none"
      data-ss-animate
      style={
        isAdmin
          ? undefined
          : {
              animation:
                "ui-enter-soft 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
            }
      }
    >
      {children}
    </div>
  );
}
