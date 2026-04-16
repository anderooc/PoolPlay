import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tournaments, teams, teamMembers, registrations } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [userTeams, recentTournaments, totalTeams, totalTournaments] =
    await Promise.all([
      db
        .select({
          id: teams.id,
          name: teams.name,
          university: teams.university,
          role: teamMembers.role,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teamMembers.userId, user.id)),
      db
        .select()
        .from(tournaments)
        .orderBy(desc(tournaments.createdAt))
        .limit(5),
      db.select({ value: count() }).from(teams),
      db.select({ value: count() }).from(tournaments),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.fullName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening on PoolPlay.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userTeams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tournaments
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTournaments[0].value}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Registered Teams
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeams[0].value}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Teams</CardTitle>
            <Link href="/teams/new" className={buttonVariants({ size: "sm" })}>
                <Plus className="mr-2 h-4 w-4" />
                New Team
            </Link>
          </CardHeader>
          <CardContent>
            {userTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t joined any teams yet.
              </p>
            ) : (
              <div className="space-y-3">
                {userTeams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {team.university}
                      </p>
                    </div>
                    <Badge variant="secondary">{team.role}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Tournaments</CardTitle>
            <Link href="/tournaments/new" className={buttonVariants({ size: "sm" })}>
                <Plus className="mr-2 h-4 w-4" />
                New Tournament
            </Link>
          </CardHeader>
          <CardContent>
            {recentTournaments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tournaments yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentTournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.location} &middot; {t.startDate}
                      </p>
                    </div>
                    <Badge
                      variant={
                        t.status === "in_progress" ? "default" : "secondary"
                      }
                    >
                      {t.status.replace(/_/g, " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
