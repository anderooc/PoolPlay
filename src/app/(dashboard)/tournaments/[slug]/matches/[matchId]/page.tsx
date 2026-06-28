import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, sets, teams, courts, teamMembers } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { BackLink } from "@/components/layout/back-link";
import { getTournamentBySlugIfVisible } from "@/lib/tournaments/access";
import {
  canRefereeMatch,
  isTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import { getMatchTournamentId } from "@/lib/tournaments/match-query";
import {
  getMatchDivisionIdMap,
  getUnreleasedDivisionIds,
} from "@/lib/tournaments/unreleased-divisions";
import { MatchConsole } from "./match-console";

interface Props {
  params: Promise<{ slug: string; matchId: string }>;
}

async function loadTeam(teamId: string | null) {
  if (!teamId) return null;
  const [row] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  return row ?? null;
}

export default async function MatchPage({ params }: Props) {
  const { slug, matchId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tournament = await getTournamentBySlugIfVisible(slug, user);
  if (!tournament) notFound();

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) notFound();

  const matchTournamentId = await getMatchTournamentId(match.id);
  if (matchTournamentId !== tournament.id) notFound();

  const isOrganizer = isTournamentOrganizer(tournament, user);

  if (!isOrganizer) {
    const [unreleased, divisionByMatch] = await Promise.all([
      getUnreleasedDivisionIds(tournament.id),
      getMatchDivisionIdMap(tournament.id),
    ]);
    const divisionId = divisionByMatch.get(match.id);
    if (divisionId && unreleased.has(divisionId)) notFound();
  }

  const [teamA, teamB, refTeam, courtRow, matchSets, memberRows] =
    await Promise.all([
      loadTeam(match.teamAId),
      loadTeam(match.teamBId),
      loadTeam(match.refTeamId),
      match.courtId
        ? db
            .select({ name: courts.name })
            .from(courts)
            .where(eq(courts.id, match.courtId))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({
          setNumber: sets.setNumber,
          teamAScore: sets.teamAScore,
          teamBScore: sets.teamBScore,
        })
        .from(sets)
        .where(eq(sets.matchId, match.id))
        .orderBy(asc(sets.setNumber)),
      db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, user.id)),
    ]);

  const userTeamIds = new Set(memberRows.map((r) => r.teamId));
  const canControl = canRefereeMatch(tournament, user, match, userTeamIds);
  const isRefMember =
    !isOrganizer &&
    match.refTeamId != null &&
    userTeamIds.has(match.refTeamId);

  return (
    <div className="space-y-6">
      <BackLink href={`/tournaments/${slug}`}>Back to tournament</BackLink>
      <MatchConsole
        slug={slug}
        tournamentId={tournament.id}
        match={{
          id: match.id,
          status: match.status,
          scheduledTime: match.scheduledTime
            ? match.scheduledTime.toISOString()
            : null,
          warmupStartedAt: match.warmupStartedAt
            ? match.warmupStartedAt.toISOString()
            : null,
          startedAt: match.startedAt ? match.startedAt.toISOString() : null,
          winnerId: match.winnerId,
          teamA,
          teamB,
          refTeamName: refTeam?.name ?? null,
          courtName: courtRow[0]?.name ?? null,
          sets: matchSets,
        }}
        settings={{
          matchFormat: tournament.matchFormat,
          setStartingScore: tournament.setStartingScore,
          setTargetScore: tournament.setTargetScore,
          tiebreakTargetScore: tournament.tiebreakTargetScore,
          warmupFormat: tournament.warmupFormat,
        }}
        canControl={canControl}
        isOrganizer={isOrganizer}
        isRefMember={isRefMember}
      />
    </div>
  );
}
