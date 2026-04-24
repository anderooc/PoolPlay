"use client";

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
  return (
    <div
      key={pathname}
      className="h-full"
      style={{
        animation: "ui-enter-soft 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      {children}
    </div>
  );
}
