"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TOP_LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

/** Top bar links: no route-based highlight — same muted style for every item. */
export function HeaderNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Site"
      className={cn("flex items-center gap-1 sm:gap-4", className)}
    >
      {TOP_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-[color,background-color,transform] duration-200 ease-out hover:text-foreground motion-safe:hover:-translate-y-0.5 sm:px-3"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
