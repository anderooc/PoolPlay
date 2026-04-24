import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TeamsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userTeams = await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      university: teams.university,
      season: teams.season,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, user.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Teams
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your club volleyball teams.
          </p>
        </div>
        <Link
          href="/teams/new"
          className={buttonVariants({ className: "w-full sm:w-auto" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Link>
      </div>

      {userTeams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create your first team to manage your roster and register for tournaments."
          action={
            <Link href="/teams/new" className={buttonVariants()}>
              <Plus className="mr-2 h-4 w-4" />
              Create team
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userTeams.map((team) => (
            <Link key={team.id} href={`/teams/${team.slug}`}>
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">
                      {team.name}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {team.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {team.university}
                  </p>
                  {team.season && (
                    <p className="mt-1 text-sm text-muted-foreground/80">
                      {team.season}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
