import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  tournaments,
  divisions,
  courts,
  registrations,
  teams,
  users,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { MapPin, Calendar } from "lucide-react";
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
    .where(eq(divisions.tournamentId, id));

  const tournamentCourts = await db
    .select()
    .from(courts)
    .where(eq(courts.tournamentId, id));

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
    .innerJoin(divisions, eq(registrations.divisionId, divisions.id))
    .where(eq(registrations.tournamentId, id));

  const isOrganizer = tournament.organizerId === user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {tournament.name}
            </h1>
            <Badge
              variant={
                tournament.status === "in_progress" ? "default" : "secondary"
              }
            >
              {tournament.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {tournament.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {tournament.startDate}
              {tournament.startDate !== tournament.endDate &&
                ` \u2013 ${tournament.endDate}`}
            </span>
          </div>
          {tournament.description && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              {tournament.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Organized by {organizer?.fullName ?? "Unknown"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tournament.status === "registration_open" && !isOrganizer && (
            <Link href={`/tournaments/${tournament.id}/register`} className={buttonVariants()}>
                Register Team
            </Link>
          )}
          <Link href={`/tournaments/${tournament.id}/brackets`} className={buttonVariants({ variant: "outline" })}>
              Pools &amp; Brackets
          </Link>
          <Link href={`/tournaments/${tournament.id}/scoring`} className={buttonVariants({ variant: "outline" })}>
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
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="registrations">
            Registrations ({tournamentRegistrations.length})
          </TabsTrigger>
          <TabsTrigger value="courts">
            Courts ({tournamentCourts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="divisions" className="mt-4">
          <DivisionManager
            tournamentId={id}
            divisions={tournamentDivisions}
            isOrganizer={isOrganizer}
            isDraft={tournament.status === "draft"}
          />
        </TabsContent>

        <TabsContent value="registrations" className="mt-4">
          <RegistrationList
            registrations={tournamentRegistrations}
            isOrganizer={isOrganizer}
          />
        </TabsContent>

        <TabsContent value="courts" className="mt-4">
          <CourtManager
            tournamentId={id}
            courts={tournamentCourts}
            isOrganizer={isOrganizer}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
