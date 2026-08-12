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

import { useEffect } from "react";

/** Scrolls the focused pool into view after the pools tab mounts. */
export function ScrollToPool({ poolId }: { poolId: string | null }) {
  useEffect(() => {
    if (!poolId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const tryScroll = () => {
      if (cancelled) return;
      const el = document.getElementById(`pool-${poolId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(tryScroll, 50);
      }
    };

    const frame = window.requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [poolId]);

  return null;
}
