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

import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders the tournament venue with an icon + text. When an address is
 * provided the whole row becomes a Google Maps link; otherwise it stays as
 * plain text (linking to a search for just the venue name tends to be
 * unhelpful, so we skip the link in that case).
 */
export function TournamentLocationLink({
  location,
  address,
  className,
  iconClassName = "h-3.5 w-3.5",
  showExternalIcon = true,
}: {
  location: string;
  address?: string | null;
  className?: string;
  iconClassName?: string;
  showExternalIcon?: boolean;
}) {
  const trimmedAddress = address?.trim() || null;
  const displayText = trimmedAddress
    ? `${location} · ${trimmedAddress}`
    : location;
  const ariaLabel = trimmedAddress
    ? `${location}, ${trimmedAddress}`
    : location;

  const body = (
    <>
      <MapPin className={cn("shrink-0", iconClassName)} aria-hidden />
      <span className="min-w-0 truncate">{displayText}</span>
      {showExternalIcon && trimmedAddress ? (
        <ExternalLink
          className={cn("shrink-0 opacity-60", iconClassName)}
          aria-hidden
        />
      ) : null}
    </>
  );

  if (!trimmedAddress) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full min-w-0 items-center gap-1.5",
          className
        )}
      >
        {body}
      </span>
    );
  }

  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${location}, ${trimmedAddress}`
  )}`;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${ariaLabel} in Google Maps`}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-sm underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {body}
    </Link>
  );
}
