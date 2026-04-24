import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  tournaments,
  divisions,
  courts,
  courtDivisions,
  registrations,
  teams,
  users,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { MapPin, Calendar, User } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/components/layout/back-link";
import { TournamentPageHeading } from "./tournament-page-heading";
import { DivisionManager } from "./division-manager";
import { CourtManager } from "./court-manager";
import { RegistrationList } from "./registration-list";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params;

  // Resolve the tournament + current user in parallel; both are needed
  // before the other queries can run, but they don't depend on each other.
  const [user, tournamentRow] = await Promise.all([
    getCurrentUser(),
    db
      .select()
      .from(tournaments)
      .where(eq(tournaments.slug, slug))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!user) redirect("/login");
  if (!tournamentRow) notFound();

  const tournament = tournamentRow;
  const id = tournament.id;

  // Fan out the rest of the tournament data in a single round-trip batch.
  const [
    organizer,
    tournamentDivisions,
    courtRows,
    courtDivisionLinks,
    tournamentRegistrations,
  ] = await Promise.all([
    db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, tournament.organizerId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(divisions)
      .where(eq(divisions.tournamentId, id))
      .orderBy(asc(divisions.name), asc(divisions.id)),
    db
      .select({ id: courts.id, name: courts.name })
      .from(courts)
      .where(eq(courts.tournamentId, id))
      .orderBy(asc(courts.name), asc(courts.id)),
    db
      .select({
        courtId: courtDivisions.courtId,
        divisionId: courtDivisions.divisionId,
        divisionName: divisions.name,
      })
      .from(courtDivisions)
      .innerJoin(courts, eq(courtDivisions.courtId, courts.id))
      .innerJoin(divisions, eq(courtDivisions.divisionId, divisions.id))
      .where(eq(courts.tournamentId, id)),
    db
      .select({
        id: registrations.id,
        status: registrations.status,
        registeredAt: registrations.registeredAt,
        teamId: teams.id,
        teamName: teams.name,
        teamUniversity: teams.university,
        divisionId: divisions.id,
        divisionName: divisions.name,
      })
      .from(registrations)
      .innerJoin(teams, eq(registrations.teamId, teams.id))
      .leftJoin(divisions, eq(registrations.divisionId, divisions.id))
      .where(eq(registrations.tournamentId, id))
      .orderBy(asc(registrations.registeredAt), asc(teams.name)),
  ]);

  type CourtDivPair = { divisionId: string; divisionName: string };
  const pairsByCourt = new Map<string, CourtDivPair[]>();
  for (const row of courtDivisionLinks) {
    const list = pairsByCourt.get(row.courtId) ?? [];
    list.push({
      divisionId: row.divisionId,
      divisionName: row.divisionName,
    });
    pairsByCourt.set(row.courtId, list);
  }

  const tournamentCourts = courtRows.map((c) => {
    const pairs = (pairsByCourt.get(c.id) ?? [])
      .slice()
      .sort((a, b) => a.divisionName.localeCompare(b.divisionName));
    return {
      id: c.id,
      name: c.name,
      divisionIds: pairs.map((p) => p.divisionId),
      divisionNames: pairs.map((p) => p.divisionName),
    };
  });

  const isOrganizer = tournament.organizerId === user.id;

  return (
    <div className="space-y-6">
      <BackLink href="/tournaments">All tournaments</BackLink>

      {isOrganizer ? (
        <TournamentPageHeading
          tournamentId={tournament.id}
          initialSlug={tournament.slug}
          initialName={tournament.name}
          description={tournament.description}
          location={tournament.location}
          startDate={tournament.startDate}
          endDate={tournament.endDate}
          organizerName={organizer?.fullName ?? "Unknown organizer"}
          status={tournament.status}
        />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {tournament.name}
              </h1>
              <Badge
                variant={
                  tournament.status === "in_progress" ? "default" : "secondary"
                }
                className="shrink-0"
              >
                {tournament.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {tournament.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {tournament.startDate}
                {tournament.startDate !== tournament.endDate &&
                  `\u00A0\u2013\u00A0${tournament.endDate}`}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {organizer?.fullName ?? "Unknown organizer"}
              </span>
            </div>
            {tournament.description && (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                {tournament.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {tournament.status === "registration_open" && (
              <Link
                href={`/tournaments/${tournament.slug}/register`}
                className={buttonVariants({ className: "w-full sm:w-auto" })}
              >
                Register Team
              </Link>
            )}
            <Link
              href={`/tournaments/${tournament.slug}/brackets`}
              className={buttonVariants({ variant: "outline" })}
            >
              Pools &amp; Brackets
            </Link>
            <Link
              href={`/tournaments/${tournament.slug}/scoring`}
              className={buttonVariants({ variant: "outline" })}
            >
              Live Scoring
            </Link>
          </div>
        </div>
      )}

      <Tabs defaultValue="divisions">
        <TabsList>
          <TabsTrigger value="divisions">
            Divisions &amp; courts
          </TabsTrigger>
          <TabsTrigger value="registrations">
            Registrations ({tournamentRegistrations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="divisions" className="mt-4 space-y-10">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Divisions</h2>
            <DivisionManager
              tournamentId={id}
              divisions={tournamentDivisions}
              tournamentCourts={tournamentCourts.map((c) => ({
                id: c.id,
                name: c.name,
                divisionIds: c.divisionIds,
              }))}
              isOrganizer={isOrganizer}
            />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Courts</h2>
            <p className="text-sm text-muted-foreground">
              Used when auto-scheduling matches and on the live scoring view.
            </p>
            <CourtManager
              tournamentId={id}
              courts={tournamentCourts.map((c) => ({
                id: c.id,
                name: c.name,
                divisionNames: c.divisionNames,
              }))}
              isOrganizer={isOrganizer}
            />
          </section>
        </TabsContent>

        <TabsContent value="registrations" className="mt-4">
          <RegistrationList
            registrations={tournamentRegistrations}
            divisions={tournamentDivisions.map((d) => ({
              id: d.id,
              name: d.name,
            }))}
            isOrganizer={isOrganizer}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
