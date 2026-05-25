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
  const label = trimmedAddress ? `${location} · ${trimmedAddress}` : location;

  if (!trimmedAddress) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1",
          className
        )}
      >
        <MapPin className={cn("shrink-0", iconClassName)} />
        <span className="min-w-0 truncate">{label}</span>
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
      aria-label={`Open ${label} in Google Maps`}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-sm underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <MapPin className={cn("shrink-0", iconClassName)} />
      <span className="min-w-0 truncate">{label}</span>
      {showExternalIcon && (
        <ExternalLink
          className={cn("shrink-0 opacity-60", iconClassName)}
          aria-hidden
        />
      )}
    </Link>
  );
}
