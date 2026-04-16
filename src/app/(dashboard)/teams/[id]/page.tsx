import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddMemberForm } from "./add-member-form";
import { RosterRow } from "./roster-row";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  if (!team) notFound();

  const members = await db
    .select({
      id: teamMembers.id,
      role: teamMembers.role,
      jerseyNumber: teamMembers.jerseyNumber,
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, id));

  const currentMembership = members.find((m) => m.userId === user.id);
  const isCaptain = currentMembership?.role === "captain";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
        <p className="text-muted-foreground">
          {team.university}
          {team.season && ` \u00B7 ${team.season}`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Roster ({members.length} {members.length === 1 ? "player" : "players"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <RosterRow
                key={member.id}
                member={member}
                isCaptain={isCaptain}
                teamId={id}
              />
            ))}
          </div>

          {isCaptain && (
            <>
              <Separator className="my-6" />
              <AddMemberForm teamId={id} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
