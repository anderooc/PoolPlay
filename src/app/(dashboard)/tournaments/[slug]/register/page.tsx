import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamMembers, registrations } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getTournamentBySlugIfVisible } from "@/lib/tournaments/access";
import { formatTeamGender } from "@/lib/labels/team";
import {
  canRegisterTeams,
  isTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/back-link";
import { RegisterForm } from "./register-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tournament = await getTournamentBySlugIfVisible(slug, user);
  if (!tournament) notFound();

  const id = tournament.id;

  if (!canRegisterTeams(tournament)) {
    return (
      <div className="space-y-3">
        <BackLink href={`/tournaments/${tournament.slug}`}>
          Back to tournament
        </BackLink>
        <div className="mx-auto max-w-lg">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                Registration is not currently open for this tournament.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isHost = isTournamentOrganizer(tournament, user);
  const tournamentGenderLabel = formatTeamGender(tournament.gender);

  // Run the existing-registrations lookup in parallel with the candidate
  // teams query so both complete in a single round-trip instead of two.
  const [existingRegs, candidateTeams] = await Promise.all([
    db
      .select({ teamId: registrations.teamId })
      .from(registrations)
      .where(eq(registrations.tournamentId, id)),
    isHost
      ? db
          .select({
            id: teams.id,
            name: teams.name,
            university: teams.university,
          })
          .from(teams)
          .where(eq(teams.gender, tournament.gender))
          .orderBy(asc(teams.name))
      : db
          .select({
            id: teams.id,
            name: teams.name,
            university: teams.university,
          })
          .from(teamMembers)
          .innerJoin(teams, eq(teamMembers.teamId, teams.id))
          .where(
            and(
              eq(teamMembers.userId, user.id),
              eq(teamMembers.role, "captain"),
              eq(teams.gender, tournament.gender)
            )
          ),
  ]);

  const alreadyRegisteredIds = new Set(existingRegs.map((r) => r.teamId));
  const availableTeams = candidateTeams.filter(
    (t) => !alreadyRegisteredIds.has(t.id)
  );

  const emptyMessage = isHost
    ? `Every ${tournamentGenderLabel} team is already registered, or no matching teams exist in PoolPlay yet.`
    : `You don't have any ${tournamentGenderLabel} teams eligible to register. Captain a matching team that isn't already signed up, or ask the host to add your team.`;

  return (
    <div className="space-y-3">
      <BackLink href={`/tournaments/${tournament.slug}`}>
        Back to tournament
      </BackLink>
      <div className="mx-auto max-w-lg">
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>
              {isHost ? "Add teams to" : "Register for"} {tournament.name}
            </CardTitle>
            <TeamAttributesBadges
              gender={tournament.gender}
              region={tournament.region}
              className="mt-2"
            />
            {isHost ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Select one or more {tournamentGenderLabel} teams to add. Division
                and pool placement can be set later from the tournament page, and
                host-added teams are confirmed automatically.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Select one or more {tournamentGenderLabel} teams to register for
                this event.
              </p>
            )}
          </CardHeader>
          <CardContent className="overflow-visible">
            {availableTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              <RegisterForm
                tournamentId={id}
                tournamentSlug={tournament.slug}
                teams={availableTeams}
                asHost={isHost}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
