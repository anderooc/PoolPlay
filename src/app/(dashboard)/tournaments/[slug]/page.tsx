import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  divisions,
  courts,
  courtDivisions,
  registrations,
  teams,
  users,
  pools,
  brackets,
  matches,
  teamMembers,
} from "@/lib/db/schema";
import { eq, asc, and, count, isNotNull, inArray } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, User } from "lucide-react";
import { TournamentLocationLink } from "@/components/tournament-location-link";
import Link from "next/link";
import { BackLink } from "@/components/layout/back-link";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { TournamentHostSchoolLink } from "@/components/tournament-host-school-link";
import { formatTournamentDateDisplay } from "@/lib/date-iso";
import { isTournamentArchived } from "@/lib/tournament-status";
import {
  canEditRegistrations,
  canEditTournamentSetup,
  canCheckInRegistrations,
  canRegisterTeams,
  hostChecklistSteps,
  isTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import { getTournamentMatchIds } from "@/lib/tournaments/match-query";
import { getHostSchoolById } from "@/lib/tournaments/host-school";
import { getTournamentBySlugIfVisible } from "@/lib/tournaments/access";
import { TournamentPageHeading } from "./tournament-page-heading";
import { PoolManager } from "./pool-manager";
import { CourtManager } from "./court-manager";
import { RegistrationList } from "./registration-list";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params;

  // Resolve the tournament + current user in parallel; both are needed
  // before the other queries can run, but they don't depend on each other.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tournamentRow = await getTournamentBySlugIfVisible(slug, user);
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

  const isOrganizer = isTournamentOrganizer(tournament, user);
  const canEditSetup =
    isOrganizer && canEditTournamentSetup(tournament, user);
  const canManageRegistrations =
    isOrganizer && canEditRegistrations(tournament, user);
  const canCheckIn =
    isOrganizer && canCheckInRegistrations(tournament, user);
  const showRegisterLink = canRegisterTeams(tournament);

  const [poolRow, bracketRow, userTeamRows, captainTeamIds, matchIds, hostSchool] =
    await Promise.all([
    db
      .select({ id: pools.id })
      .from(pools)
      .innerJoin(divisions, eq(pools.divisionId, divisions.id))
      .where(eq(divisions.tournamentId, id))
      .limit(1),
    db
      .select({ id: brackets.id })
      .from(brackets)
      .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
      .where(eq(divisions.tournamentId, id))
      .limit(1),
    db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id)),
    db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.role, "captain")
        )
      ),
    getTournamentMatchIds(id),
    getHostSchoolById(tournament.hostSchoolId),
  ]);

  let hasScheduledMatches = false;
  if (matchIds.length > 0) {
    const [scheduled] = await db
      .select({ value: count() })
      .from(matches)
      .where(
        and(
          inArray(matches.id, matchIds),
          isNotNull(matches.scheduledTime)
        )
      );
    hasScheduledMatches = (scheduled?.value ?? 0) > 0;
  }

  const allPendingTeams = tournamentRegistrations.filter(
    (r) => r.status === "pending"
  );

  const confirmedTeams = tournamentRegistrations.filter(
    (r) => r.status === "confirmed" || r.status === "checked_in"
  );

  const myTeamIds = new Set(userTeamRows.map((r) => r.teamId));
  const captainIds = new Set(captainTeamIds.map((r) => r.teamId));

  const pendingCount = allPendingTeams.length;

  const pendingTeams = isOrganizer
    ? allPendingTeams
    : allPendingTeams.filter((r) => myTeamIds.has(r.teamId));

  const showTeamsTab = isOrganizer;
  const showPendingTab = isOrganizer || pendingTeams.length > 0;
  const defaultTab =
    !isOrganizer && pendingTeams.length > 0 ? "pending" : "pools";

  const divisionOptions = tournamentDivisions.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  const checklist = isOrganizer
    ? hostChecklistSteps({
        status: tournament.status,
        description: tournament.description,
        address: tournament.address,
        divisionCount: tournamentDivisions.length,
        courtCount: tournamentCourts.length,
        registrationCount: tournamentRegistrations.length,
        pendingCount,
        hasPools: poolRow.length > 0,
        hasBracket: bracketRow.length > 0,
        hasScheduledMatches,
      })
    : [];

  const emptySetup =
    tournamentDivisions.length === 0 && courtRows.length === 0;

  return (
    <div className={emptySetup ? "space-y-3" : "space-y-6"}>
      <BackLink href="/tournaments">All tournaments</BackLink>

      {isOrganizer ? (
        <TournamentPageHeading
          tournamentId={tournament.id}
          initialSlug={tournament.slug}
          initialName={tournament.name}
          description={tournament.description}
          location={tournament.location}
          address={tournament.address}
          date={tournament.date}
          gender={tournament.gender}
          region={tournament.region}
          organizerName={organizer?.fullName ?? "Unknown organizer"}
          status={tournament.status}
          showRegisterLink={showRegisterLink}
          hostChecklistSteps={checklist}
          hostSchool={hostSchool}
          compact={emptySetup}
        />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {tournament.name}
              </h1>
              {(() => {
                const archived = isTournamentArchived(tournament.date);
                return (
                  <Badge
                    variant={
                      archived
                        ? "outline"
                        : tournament.status === "in_progress"
                          ? "default"
                          : "secondary"
                    }
                    className={
                      archived
                        ? "shrink-0 border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground"
                        : "shrink-0"
                    }
                  >
                    {archived
                      ? "Archived"
                      : tournament.status.replace(/_/g, " ")}
                  </Badge>
                );
              })()}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
            <TeamAttributesBadges
              gender={tournament.gender}
              region={tournament.region}
              className="mt-2"
            />
            <TournamentHostSchoolLink school={hostSchool} className="mt-2" />
            {tournament.description && (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
                {tournament.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {showRegisterLink && (
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
              Groups &amp; Brackets
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

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="pools">
            Pools &amp; courts
          </TabsTrigger>
          {showTeamsTab && (
            <TabsTrigger value="teams">
              Teams ({confirmedTeams.length})
            </TabsTrigger>
          )}
          {showPendingTab && (
            <TabsTrigger value="pending" className="gap-2">
              {isOrganizer ? "Pending" : "Your application"}
              {(isOrganizer ? pendingCount : pendingTeams.length) > 0 && (
                <Badge
                  variant="default"
                  className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs tabular-nums"
                >
                  {isOrganizer ? pendingCount : pendingTeams.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent
          value="pools"
          className={emptySetup ? "mt-2 space-y-4" : "mt-4 space-y-10"}
        >
          <section className={emptySetup ? "space-y-1.5" : "space-y-3"}>
            <h2
              className={
                emptySetup
                  ? "text-base font-semibold tracking-tight"
                  : "text-lg font-semibold tracking-tight"
              }
            >
              Pools
            </h2>
            <PoolManager
              tournamentId={id}
              divisions={tournamentDivisions}
              tournamentCourts={tournamentCourts.map((c) => ({
                id: c.id,
                name: c.name,
                divisionIds: c.divisionIds,
              }))}
              isOrganizer={canEditSetup}
              compactEmpty={emptySetup}
            />
          </section>
          <section className={emptySetup ? "space-y-1.5" : "space-y-3"}>
            <h2
              className={
                emptySetup
                  ? "text-base font-semibold tracking-tight"
                  : "text-lg font-semibold tracking-tight"
              }
            >
              Courts
            </h2>
            {!emptySetup && (
              <p className="text-sm text-muted-foreground">
                Used when auto-scheduling matches and on the live scoring view.
              </p>
            )}
            <CourtManager
              tournamentId={id}
              courts={tournamentCourts.map((c) => ({
                id: c.id,
                name: c.name,
                divisionNames: c.divisionNames,
              }))}
              isOrganizer={canEditSetup}
              compactEmpty={emptySetup}
            />
          </section>
        </TabsContent>

        {showTeamsTab && (
          <TabsContent value="teams" className="mt-4 space-y-3">
            {canManageRegistrations && (
              <p className="text-sm text-muted-foreground">
                Assign confirmed teams to pools before generating groups.
              </p>
            )}
            <RegistrationList
              tournamentId={id}
              registrations={confirmedTeams}
              divisions={divisionOptions}
              listKind="teams"
              canManageRegistrations={canManageRegistrations}
              canCheckIn={canCheckIn}
              canWithdraw={canRegisterTeams(tournament)}
              captainTeamIds={captainIds}
            />
          </TabsContent>
        )}

        {showPendingTab && (
          <TabsContent value="pending" className="mt-4 space-y-3">
            {isOrganizer && canManageRegistrations && pendingCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Review and confirm registrations before assigning pools.
              </p>
            )}
            {!isOrganizer && (
              <p className="text-sm text-muted-foreground">
                Track your team&apos;s registration status for this tournament.
              </p>
            )}
            <RegistrationList
              tournamentId={id}
              registrations={pendingTeams}
              divisions={divisionOptions}
              listKind="pending"
              applicantView={!isOrganizer}
              canManageRegistrations={canManageRegistrations}
              canCheckIn={canCheckIn}
              canWithdraw={canRegisterTeams(tournament)}
              captainTeamIds={captainIds}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
