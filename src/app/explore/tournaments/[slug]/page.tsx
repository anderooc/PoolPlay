/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pageMetadata } from "@/lib/metadata";
import { PublicRegistrationAvailability } from "@/components/public-registration-availability";
import { PublicTournamentLayout } from "@/components/tournament-public/public-tournament-shell";
import { loadPublicTournamentShell } from "@/lib/tournament-public/load-shell";
import { formatTournamentDateDisplay } from "@/lib/date-iso";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const shell = await loadPublicTournamentShell(slug);
    const description =
      shell.listItem.description?.trim() ||
      `${shell.listItem.name} is a collegiate club volleyball tournament in ${shell.listItem.location} on ${formatTournamentDateDisplay(shell.listItem.date)}.`;
    return pageMetadata(shell.listItem.name, description, {
      canonical: `/explore/tournaments/${slug}`,
    });
  } catch {
    return pageMetadata("Tournament not found", undefined, { noIndex: true });
  }
}

export default async function ExploreTournamentPage({ params }: Props) {
  const { slug } = await params;
  const shell = await loadPublicTournamentShell(slug);

  return (
    <PublicTournamentLayout shell={shell}>
      <div className="space-y-4">
        {shell.listItem.description ? (
          <p className="max-w-2xl whitespace-pre-wrap text-pretty text-sm text-muted-foreground">
            {shell.listItem.description}
          </p>
        ) : null}

        {shell.hasReleasedPlay ? (
          <p className="text-sm text-muted-foreground">
            Pools, brackets, and live scores are public — use the tabs above to
            follow the tournament without signing in.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Match schedules and results will appear here after the host releases
            pools.
          </p>
        )}

        {shell.registrationOpen && (
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-3">
            <PublicRegistrationAvailability
              availability={shell.listItem.registrationAvailability}
            />
            <p className="text-pretty text-sm text-muted-foreground">
              Sign in to register a team for this tournament.
            </p>
            <Link
              href={`/tournaments/${shell.slug}/register`}
              className="mt-3 inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Register a team
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </PublicTournamentLayout>
  );
}
