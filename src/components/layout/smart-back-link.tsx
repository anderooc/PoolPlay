"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SmartBackLinkProps {
  /** Where to send the user when there's no usable in-app history. */
  fallbackHref: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Renders a "Back" affordance that prefers `router.back()` when the user
 * arrived from another page on this site, and falls back to navigating to
 * `fallbackHref` for direct visits / external referrals. Rendered as a Next
 * `<Link>` so the fallback target is prefetched.
 */
export function SmartBackLink({
  fallbackHref,
  children = "Back",
  className,
}: SmartBackLinkProps) {
  const router = useRouter();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    try {
      const referrer = document.referrer;
      if (!referrer) return;
      const refOrigin = new URL(referrer).origin;
      if (refOrigin !== window.location.origin) return;
      // Same-origin referrer means the user navigated here from another
      // page on this site — go back to it instead of the static fallback.
      event.preventDefault();
      router.back();
    } catch {
      // Any URL parse failure: let the Link handle the fallback navigation.
    }
  }

  return (
    <Link
      href={fallbackHref}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}
