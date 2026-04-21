"use client";

import { useEffect, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * After login redirect (?welcome=1), applies a soft zoom-in to the dashboard
 * workspace (no modal). Strips the query param when done.
 */
export function DashboardContentEnter({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const welcome = searchParams.get("welcome") === "1";

  useEffect(() => {
    if (!welcome) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      router.replace("/dashboard");
      return;
    }

    const id = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 900);

    return () => window.clearTimeout(id);
  }, [welcome, router]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden",
        welcome &&
          "motion-safe:origin-top motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.97] motion-safe:duration-700 motion-safe:ease-out"
      )}
    >
      {children}
    </div>
  );
}
