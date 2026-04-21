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
import { MapPin, Calendar, ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { StatusControls } from "./status-controls";
import { DivisionManager } from "./division-manager";
import { CourtManager } from "./court-manager";
import { RegistrationList } from "./registration-list";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);

  if (!tournament) notFound();

  const [organizer] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, tournament.organizerId))
    .limit(1);

  const tournamentDivisions = await db
    .select()
    .from(divisions)
    .where(eq(divisions.tournamentId, id))
    .orderBy(asc(divisions.name), asc(divisions.id));

  const courtRows = await db
    .select({ id: courts.id, name: courts.name })
    .from(courts)
    .where(eq(courts.tournamentId, id))
    .orderBy(asc(courts.name), asc(courts.id));

  const courtDivisionLinks = await db
    .select({
      courtId: courtDivisions.courtId,
      divisionId: courtDivisions.divisionId,
      divisionName: divisions.name,
    })
    .from(courtDivisions)
    .innerJoin(courts, eq(courtDivisions.courtId, courts.id))
    .innerJoin(divisions, eq(courtDivisions.divisionId, divisions.id))
    .where(eq(courts.tournamentId, id));

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

  const tournamentRegistrations = await db
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
    .orderBy(asc(registrations.registeredAt), asc(teams.name));

  const isOrganizer = tournament.organizerId === user.id;

  return (
    <div className="space-y-6">
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All tournaments
      </Link>

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
              href={`/tournaments/${tournament.id}/register`}
              className={buttonVariants({ className: "w-full sm:w-auto" })}
            >
              {isOrganizer ? "Add / register teams" : "Register Team"}
            </Link>
          )}
          <Link
            href={`/tournaments/${tournament.id}/brackets`}
            className={buttonVariants({ variant: "outline" })}
          >
            Pools &amp; Brackets
          </Link>
          <Link
            href={`/tournaments/${tournament.id}/scoring`}
            className={buttonVariants({ variant: "outline" })}
          >
            Live Scoring
          </Link>
          {isOrganizer && (
            <StatusControls
              tournamentId={tournament.id}
              currentStatus={tournament.status}
            />
          )}
        </div>
      </div>

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
