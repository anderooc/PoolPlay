import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  tournaments,
  divisions,
  teams,
  teamMembers,
  registrations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RegisterPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);

  if (!tournament) notFound();

  if (tournament.status !== "registration_open") {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              Registration is not currently open for this tournament.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tournamentDivisions = await db
    .select()
    .from(divisions)
    .where(eq(divisions.tournamentId, id));

  const captainTeams = await db
    .select({ id: teams.id, name: teams.name, university: teams.university })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(eq(teamMembers.userId, user.id), eq(teamMembers.role, "captain"))
    );

  const existingRegs = await db
    .select({ teamId: registrations.teamId })
    .from(registrations)
    .where(eq(registrations.tournamentId, id));

  const alreadyRegisteredIds = new Set(existingRegs.map((r) => r.teamId));
  const availableTeams = captainTeams.filter(
    (t) => !alreadyRegisteredIds.has(t.id)
  );

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Register for {tournament.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {availableTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any teams eligible to register. Either all your
              teams are already registered, or you need to be a team captain.
            </p>
          ) : (
            <RegisterForm
              tournamentId={id}
              teams={availableTeams}
              divisions={tournamentDivisions.map((d) => ({
                id: d.id,
                name: d.name,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
