import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { tournaments, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeaderNav } from "@/components/layout/header-nav";
import { PoolPlayMark } from "@/components/layout/poolplay-mark";
import { UserMenu } from "@/components/layout/user-menu";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { getCurrentAuthProfile } from "@/lib/auth";
import { isTournamentPublishedForPublic } from "@/lib/tournaments/permissions";
import { formatTournamentDateDisplay } from "@/lib/date-iso";
import {
  isTournamentArchived,
  statusBadgeLabel,
} from "@/lib/tournament-status";
import { Calendar, MapPin, User } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ExploreTournamentPage({ params }: Props) {
  const { slug } = await params;
  const authProfile = await getCurrentAuthProfile();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);

  if (!tournament || !isTournamentPublishedForPublic(tournament)) {
    notFound();
  }

  const [organizer] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, tournament.organizerId))
    .limit(1);

  const archived = isTournamentArchived(tournament.date);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <PoolPlayMark href="/" wordmarkClassName="text-lg" />
            <HeaderNav />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {authProfile ? (
              <UserMenu
                fullName={authProfile.fullName}
                email={authProfile.email}
              />
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Sign In
                </Link>
                <Link href="/signup" className={buttonVariants({ size: "sm" })}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
          <Link
            href="/explore"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← All tournaments
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {tournament.name}
              </h1>
              <Badge variant={archived ? "outline" : "secondary"}>
                {statusBadgeLabel(tournament.status, tournament.date)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {tournament.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatTournamentDateDisplay(tournament.date)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {organizer?.fullName ?? "Unknown organizer"}
              </span>
            </div>
            <TeamAttributesBadges
              gender={tournament.gender}
              region={tournament.region}
              className="mt-2"
            />
            {tournament.description && (
              <p className="mt-3 text-sm text-muted-foreground">
                {tournament.description}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Sign in to register a team, view brackets, and follow live scores.
          </p>
          <Link
            href={`/tournaments/${tournament.slug}`}
            className={buttonVariants()}
          >
            Open in dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
