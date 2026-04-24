"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BackLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** When true, Next will eagerly prefetch the target. Defaults to true. */
  prefetch?: boolean;
}

function BackLinkStatus() {
  const { pending } = useLinkStatus();
  return (
    <>
      <ArrowLeft
        aria-hidden
        className={cn(
          "h-3.5 w-3.5 transition-opacity duration-150",
          pending && "opacity-0"
        )}
      />
      {pending && (
        <Loader2
          aria-hidden
          className="absolute h-3.5 w-3.5 animate-spin text-muted-foreground"
        />
      )}
    </>
  );
}

/**
 * Small "Back to …" link used above page content. Styled to match the
 * existing tournament back link (muted, hover-darkens). Shows a tiny
 * spinner while the navigation is pending so slow routes don't feel
 * frozen.
 */
export function BackLink({
  href,
  children,
  className,
  prefetch = true,
}: BackLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        "group/backlink inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
        <BackLinkStatus />
      </span>
      {children}
    </Link>
  );
}
