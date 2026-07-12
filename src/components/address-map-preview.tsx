"use client";

/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import { useEffect, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Debounced live Google Maps preview that renders below an address input.
 *
 * Uses the keyless Maps embed pattern (`maps.google.com/maps?q=…&output=embed`),
 * so it works without provisioning a Maps JavaScript API key. The iframe is
 * only mounted once the query has a few characters, and re-mounts after a
 * short debounce to avoid hammering the embed for every keystroke.
 */
export function AddressMapPreview({
  address,
  location,
  className,
  height = 180,
  debounceMs = 600,
  /** Minimum trimmed length of the combined query before showing the map. */
  minLength = 4,
}: {
  address: string;
  location?: string;
  className?: string;
  height?: number;
  debounceMs?: number;
  minLength?: number;
}) {
  const trimmedAddress = address.trim();
  const trimmedLocation = (location ?? "").trim();
  const query = [trimmedLocation, trimmedAddress].filter(Boolean).join(", ");

  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => window.clearTimeout(t);
  }, [query, debounceMs]);

  if (trimmedAddress.length === 0) return null;

  const ready = debouncedQuery.length >= minLength;
  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    debouncedQuery
  )}&output=embed`;
  const openSrc = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    debouncedQuery
  )}`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-muted/30",
        className
      )}
    >
      {ready ? (
        <iframe
          key={debouncedQuery}
          title="Map preview"
          src={embedSrc}
          width="100%"
          height={height}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block w-full border-0"
        />
      ) : (
        <div
          className="flex items-center justify-center px-3 text-xs text-muted-foreground"
          style={{ height }}
        >
          <MapPin className="mr-1.5 h-3.5 w-3.5" />
          Keep typing to preview the location on a map…
        </div>
      )}
      {ready && (
        <div className="flex items-center justify-between gap-2 border-t bg-background px-2 py-1.5 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">{debouncedQuery}</span>
          <Link
            href={openSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-foreground hover:underline"
          >
            Open in Google Maps
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
