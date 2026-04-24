import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tournaments, teams, teamMembers, registrations } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/back-link";
import { RegisterForm } from "./register-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params;

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

  if (tournament.status !== "registration_open") {
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

  const isHost = tournament.organizerId === user.id;

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
              eq(teamMembers.role, "captain")
            )
          ),
  ]);

  const alreadyRegisteredIds = new Set(existingRegs.map((r) => r.teamId));
  const availableTeams = candidateTeams.filter(
    (t) => !alreadyRegisteredIds.has(t.id)
  );

  const emptyMessage = isHost
    ? "Every team is already registered for this tournament, or no teams exist in PoolPlay yet."
    : "You don't have any teams eligible to register. Either all your teams are already registered, or you need to be a team captain. The tournament host can register teams on your behalf.";

  return (
    <div className="space-y-3">
      <BackLink href={`/tournaments/${tournament.slug}`}>
        Back to tournament
      </BackLink>
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>
              {isHost ? "Add teams to" : "Register for"} {tournament.name}
            </CardTitle>
            {isHost && (
              <p className="text-sm text-muted-foreground">
                As host, you can register any team for this tournament. Division
                and pool placement can be set later from the tournament page, and
                host-added teams are confirmed automatically.
              </p>
            )}
          </CardHeader>
          <CardContent>
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
