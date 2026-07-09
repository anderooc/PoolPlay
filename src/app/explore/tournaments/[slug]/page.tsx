import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { tournaments, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { HeaderNav } from "@/components/layout/header-nav";
import { PoolPlayMark } from "@/components/layout/poolplay-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { TournamentHostSchoolLink } from "@/components/tournament-host-school-link";
import { getCurrentAuthProfile } from "@/lib/auth";
import { getHostSchoolById } from "@/lib/tournaments/host-school";
import { isTournamentPublishedForPublic } from "@/lib/tournaments/permissions";
import { formatTournamentDateDisplay } from "@/lib/date-iso";
import { ArrowRight, Calendar, User } from "lucide-react";
import { TournamentLocationLink } from "@/components/tournament-location-link";
import type { Metadata } from "next";
import { getTournamentNameBySlug } from "@/lib/tournaments/metadata";
import { pageMetadata } from "@/lib/metadata";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const name = await getTournamentNameBySlug(slug);
  return pageMetadata(name ?? "Tournament");
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

  const [organizer, hostSchool] = await Promise.all([
    db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, tournament.organizerId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getHostSchoolById(tournament.hostSchoolId),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <PoolPlayMark href="/" wordmarkClassName="text-lg" />
            <HeaderNav />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
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

      <main className="relative flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 text-foreground/[0.05] bg-dot-grid [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
          <Link
            href="/explore"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← All tournaments
          </Link>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                {tournament.name}
              </h1>
              <StatusBadge
                kind="tournament"
                status={tournament.status}
                date={tournament.date}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              <TournamentLocationLink
                location={tournament.location}
                address={tournament.address}
              />
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatTournamentDateDisplay(tournament.date)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {organizer?.fullName ?? "Unknown organizer"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TeamAttributesBadges
                gender={tournament.gender}
                region={tournament.region}
              />
              <TournamentHostSchoolLink school={hostSchool} />
            </div>
            {tournament.description && (
              <p className="max-w-2xl whitespace-pre-wrap text-pretty text-sm text-muted-foreground">
                {tournament.description}
              </p>
            )}
          </div>

          <Card>
            <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-pretty text-sm text-muted-foreground">
                Sign in to register a team, view brackets, and follow live scores.
              </p>
              <Link
                href={`/tournaments/${tournament.slug}`}
                className={buttonVariants({
                  className: "group shrink-0",
                })}
              >
                Open in dashboard
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
