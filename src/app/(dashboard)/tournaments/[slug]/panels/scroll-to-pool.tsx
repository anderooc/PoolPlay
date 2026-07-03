"use client";

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
