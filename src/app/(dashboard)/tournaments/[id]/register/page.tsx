import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tournaments, teams, teamMembers, registrations } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
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

  const isHost = tournament.organizerId === user.id;

  const existingRegs = await db
    .select({ teamId: registrations.teamId })
    .from(registrations)
    .where(eq(registrations.tournamentId, id));

  const alreadyRegisteredIds = new Set(existingRegs.map((r) => r.teamId));

  let availableTeams: { id: string; name: string; university: string }[];

  if (isHost) {
    const allTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        university: teams.university,
      })
      .from(teams)
      .orderBy(asc(teams.name));

    availableTeams = allTeams.filter((t) => !alreadyRegisteredIds.has(t.id));
  } else {
    const captainTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        university: teams.university,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(eq(teamMembers.userId, user.id), eq(teamMembers.role, "captain"))
      );

    availableTeams = captainTeams.filter(
      (t) => !alreadyRegisteredIds.has(t.id)
    );
  }

  const emptyMessage = isHost
    ? "Every team is already registered for this tournament, or no teams exist in PoolPlay yet."
    : "You don't have any teams eligible to register. Either all your teams are already registered, or you need to be a team captain. The tournament host can register teams on your behalf.";

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>
            {isHost ? "Add teams to" : "Register for"} {tournament.name}
          </CardTitle>
          {isHost && (
            <p className="text-sm text-muted-foreground">
              As host, you can register any team for this tournament. Division
              and pool placement can be set later from the tournament page.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {availableTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <RegisterForm
              tournamentId={id}
              teams={availableTeams}
              asHost={isHost}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
