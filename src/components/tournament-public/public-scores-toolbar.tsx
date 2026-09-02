"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Monitor, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicScoresToolbar({
  slug,
  tournamentName,
}: {
  slug: string;
  tournamentName: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/explore/tournaments/${slug}/scores`
      : `/explore/tournaments/${slug}/scores`;
  const kioskUrl = `/explore/tournaments/${slug}/scores?kiosk=1`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
        {copied ? (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Link
        href={kioskUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        title={`Open kiosk display for ${tournamentName}`}
      >
        <Monitor className="mr-1.5 h-3.5 w-3.5" />
        Kiosk mode
      </Link>
      <span className="sr-only">
        Shareable scoreboard at {shareUrl}. Kiosk at {kioskUrl}.
      </span>
      <Copy className="sr-only" aria-hidden />
    </div>
  );
}
