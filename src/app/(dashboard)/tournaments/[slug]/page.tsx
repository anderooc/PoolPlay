import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  divisions,
  courts,
  courtDivisions,
  registrations,
  teams,
  schools,
  users,
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
import { isTournamentArchived, statusBadgeLabel } from "@/lib/tournament-status";
import {
  canAssignTeamsToPools,
  canCheckInRegistrations,
  canEditRegistrations,
  canEditTournamentSetup,
  canGeneratePoolsAndBrackets,
  canRegisterTeams,
  hostChecklistSteps,
  isTournamentOrganizer,
  poolAssignmentBlockedMessage,
} from "@/lib/tournaments/permissions";
import { getTournamentMatchIds } from "@/lib/tournaments/match-query";
import { getHostSchoolById } from "@/lib/tournaments/host-school";
import { getTournamentBySlugIfVisible } from "@/lib/tournaments/access";
import { TournamentPageHeading } from "./tournament-page-heading";
import { PoolManager } from "./pool-manager";
import { CourtManager } from "./court-manager";
import { RegistrationList } from "./registration-list";
import { getDivisionPlayData } from "./brackets/data";
import { PoolView } from "./brackets/pool-view";
import { PoolMatchFormatPanel } from "./brackets/pool-match-format-panel";
import { BracketView } from "./brackets/bracket-view";
import { PoolSeedingPanel } from "./brackets/pool-seeding-panel";
import { DivisionPoolRelease } from "./brackets/division-pool-release";
import { ensureDivisionBracketSkeleton } from "@/lib/tournaments/bracket-structure";
import { poolMatchesHaveStarted } from "@/lib/tournaments/pool-matches";

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

  // Sequential queries: parallel `Promise.all` on one Supabase pooler connection
  // (transaction mode) fails intermittently; the error often surfaces on an
  // unrelated query in the batch (e.g. registrations).
  const organizer =
    (
      await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, tournament.organizerId))
        .limit(1)
    )[0] ?? null;

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

  const tournamentRegistrations = await db
    .select({
      id: registrations.id,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      teamId: teams.id,
      teamName: teams.name,
      teamUniversity: teams.university,
      schoolId: teams.schoolId,
      schoolName: schools.name,
      divisionId: divisions.id,
      divisionName: divisions.name,
    })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .leftJoin(divisions, eq(registrations.divisionId, divisions.id))
    .where(eq(registrations.tournamentId, id))
    .orderBy(asc(registrations.registeredAt), asc(teams.name));

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

  const bracketRow = await db
    .select({ id: brackets.id })
    .from(brackets)
    .innerJoin(divisions, eq(brackets.divisionId, divisions.id))
    .where(eq(divisions.tournamentId, id))
    .limit(1);

  const userTeamRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id));

  const captainTeamIds = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.userId, user.id), eq(teamMembers.role, "captain"))
    );

  const matchIds = await getTournamentMatchIds(id);
  const hostSchool = await getHostSchoolById(tournament.hostSchoolId);
  const divisionPlayData = await getDivisionPlayData(id, {
    forOrganizer: isOrganizer,
  });

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

  const hasAnyPoolMatches = divisionPlayData.some((d) =>
    d.pools.some((p) => p.matches.length > 0)
  );
  const hasAnyBrackets = divisionPlayData.some((d) => d.brackets.length > 0);
  const hasReleasedPoolPlay = divisionPlayData.some(
    (d) => d.poolsReleasedAt != null
  );
  const hasReleasedBracket = divisionPlayData.some(
    (d) => d.poolsReleasedAt != null && d.brackets.length > 0
  );

  const hasPoolPlayFormat = tournamentDivisions.some(
    (d) => d.format === "pool_to_bracket"
  );
  const hasBracketFormat = tournamentDivisions.some(
    (d) =>
      d.format === "pool_to_bracket" ||
      d.format === "single_elimination" ||
      d.format === "double_elimination"
  );

  const showTeamsTab = isOrganizer;
  const showPendingTab = isOrganizer || pendingTeams.length > 0;
  const showPoolPlayTab = isOrganizer
    ? hasAnyPoolMatches || hasPoolPlayFormat
    : hasReleasedPoolPlay;
  const showBracketTab = isOrganizer
    ? hasAnyBrackets || hasBracketFormat
    : hasReleasedBracket;

  const defaultTab =
    !isOrganizer && pendingTeams.length > 0 ? "pending" : "setup";

  const divisionOptions = tournamentDivisions.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  const canGenerateStructure = canGeneratePoolsAndBrackets(tournament, user);
  const canAssignPools = canAssignTeamsToPools(
    tournament,
    user,
    pendingCount
  );
  const poolAssignmentBlocked = poolAssignmentBlockedMessage(pendingCount);

  const checklist = isOrganizer
    ? hostChecklistSteps({
        status: tournament.status,
        description: tournament.description,
        address: tournament.address,
        divisionCount: tournamentDivisions.length,
        courtCount: tournamentCourts.length,
        registrationCount: tournamentRegistrations.length,
        pendingCount,
        hasPools: hasAnyPoolMatches,
        hasBracket: bracketRow.length > 0,
        hasScheduledMatches,
      })
    : [];

  const emptySetup =
    tournamentDivisions.length === 0 && courtRows.length === 0;

  if (isOrganizer && tournamentDivisions.length > 0) {
    for (const div of tournamentDivisions) {
      await ensureDivisionBracketSkeleton(div.id, div.format, div.teamCap);
    }
  }

  const poolMatchesStartedByPoolId = new Map<string, boolean>();
  if (isOrganizer) {
    for (const div of divisionPlayData) {
      for (const pool of div.pools) {
        poolMatchesStartedByPoolId.set(
          pool.id,
          await poolMatchesHaveStarted(pool.id)
        );
      }
    }
  }

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
          hasScheduledMatches={hasScheduledMatches}
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
                    {statusBadgeLabel(tournament.status, tournament.date)}
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
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <TeamAttributesBadges
                gender={tournament.gender}
                region={tournament.region}
              />
              <TournamentHostSchoolLink school={hostSchool} />
            </div>
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
          <TabsTrigger value="setup">Setup</TabsTrigger>
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
          {showPoolPlayTab && (
            <TabsTrigger value="pool-play">Pools</TabsTrigger>
          )}
          {showBracketTab && (
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
          )}
        </TabsList>

        <TabsContent
          value="setup"
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
                Assign confirmed teams to pools before generating matches.
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

        {showPoolPlayTab && (
          <TabsContent value="pool-play" className="mt-4 space-y-6">
            {isOrganizer && (
              <PoolMatchFormatPanel
                tournamentId={tournament.id}
                matchFormat={tournament.matchFormat}
                setStartingScore={tournament.setStartingScore}
                setTargetScore={tournament.setTargetScore}
                tiebreakTargetScore={tournament.tiebreakTargetScore}
                warmupFormat={tournament.warmupFormat}
                poolTiebreakCriteria={tournament.poolTiebreakCriteria}
              />
            )}
            {isOrganizer && poolAssignmentBlocked && (
              <p className="text-sm text-muted-foreground">
                {poolAssignmentBlocked}
              </p>
            )}
            {(() => {
              const eligibleDivisions = divisionPlayData.filter((d) => {
                if (d.format !== "pool_to_bracket") {
                  return isOrganizer && d.pools.some((p) => p.matches.length > 0);
                }
                if (!isOrganizer && !d.poolsReleasedAt) return false;
                return isOrganizer || d.pools.some((p) => p.matches.length > 0);
              });
              if (eligibleDivisions.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    No pool play yet. Add a pool with the
                    &ldquo;Pool to bracket&rdquo; format in the Setup tab.
                  </p>
                );
              }
              return (
                <Tabs defaultValue={eligibleDivisions[0].id}>
                  {eligibleDivisions.length > 1 && (
                    <TabsList>
                      {eligibleDivisions.map((div) => (
                        <TabsTrigger key={div.id} value={div.id}>
                          {div.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  )}
                  {eligibleDivisions.map((div) => (
                    <TabsContent
                      key={div.id}
                      value={div.id}
                      className="mt-4 space-y-4"
                    >
                      {isOrganizer && (
                        <DivisionPoolRelease
                          tournamentId={id}
                          divisionId={div.id}
                          divisionName={div.name}
                          poolsReleasedAt={div.poolsReleasedAt}
                          matchCount={div.pools.reduce(
                            (n, p) => n + p.matches.length,
                            0
                          )}
                          completedMatchCount={div.pools.reduce(
                            (n, p) =>
                              n +
                              p.matches.filter(
                                (m) => m.status === "completed"
                              ).length,
                            0
                          )}
                        />
                      )}
                      {div.pools.length === 0 ||
                      div.pools.every((p) => p.teams.length === 0) ? (
                        <p className="text-sm text-muted-foreground">
                          No teams assigned to this pool yet. Add confirmed
                          teams from the Teams tab.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {div.pools.map((pool) => (
                            <div key={pool.id} className="space-y-4">
                              {isOrganizer &&
                                div.format === "pool_to_bracket" && (
                                  <PoolSeedingPanel
                                    key={`${pool.id}-${pool.teams.map((t) => t.id).join(",")}`}
                                    tournamentId={id}
                                    poolId={pool.id}
                                    poolName={pool.name}
                                    teams={pool.teams}
                                    canEdit={canAssignPools}
                                    matchesStarted={
                                      poolMatchesStartedByPoolId.get(
                                        pool.id
                                      ) ?? false
                                    }
                                  />
                                )}
                              {pool.matches.length > 0 ? (
                                <PoolView
                                  tournamentId={tournament.id}
                                  pool={pool}
                                  canEditRefs={isOrganizer}
                                  tiebreakCriteria={tournament.poolTiebreakCriteria}
                                />
                              ) : isOrganizer &&
                                div.format === "pool_to_bracket" ? (
                                <p className="text-sm text-muted-foreground">
                                  Save seeding to create pool matches.
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              );
            })()}
          </TabsContent>
        )}

        {showBracketTab && (
          <TabsContent value="bracket" className="mt-4 space-y-6">
            {isOrganizer && (
              <p className="text-sm text-muted-foreground">
                Brackets are created when you add a pool in Setup. Release a
                pool on the Pools tab when you are ready for participants to
                see standings and brackets.
              </p>
            )}
            {(() => {
              const eligibleDivisions = divisionPlayData.filter((d) => {
                const bracketFormat =
                  d.format === "pool_to_bracket" ||
                  d.format === "single_elimination" ||
                  d.format === "double_elimination";
                if (!bracketFormat) return false;
                if (!isOrganizer && !d.poolsReleasedAt) return false;
                return isOrganizer || d.brackets.length > 0;
              });
              if (eligibleDivisions.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    No bracket-style pools yet. Pick a bracket format in the
                    Setup tab.
                  </p>
                );
              }
              return (
                <Tabs defaultValue={eligibleDivisions[0].id}>
                  {eligibleDivisions.length > 1 && (
                    <TabsList>
                      {eligibleDivisions.map((div) => (
                        <TabsTrigger key={div.id} value={div.id}>
                          {div.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  )}
                  {eligibleDivisions.map((div) => (
                    <TabsContent
                      key={div.id}
                      value={div.id}
                      className="mt-4 space-y-4"
                    >
                      {isOrganizer && (
                        <DivisionPoolRelease
                          tournamentId={id}
                          divisionId={div.id}
                          divisionName={div.name}
                          poolsReleasedAt={div.poolsReleasedAt}
                          matchCount={div.pools.reduce(
                            (n, p) => n + p.matches.length,
                            0
                          )}
                          completedMatchCount={div.pools.reduce(
                            (n, p) =>
                              n +
                              p.matches.filter(
                                (m) => m.status === "completed"
                              ).length,
                            0
                          )}
                        />
                      )}
                      {div.brackets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No bracket yet for this pool. Add the pool again in
                          Setup or contact support if this persists.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {div.brackets.map((bracket) => (
                            <BracketView key={bracket.id} bracket={bracket} />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              );
            })()}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
