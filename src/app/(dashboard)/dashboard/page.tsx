import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tournaments, teams, teamMembers } from "@/lib/db/schema";
import { eq, desc, count, gte, or } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Trophy,
  Users,
  Calendar,
  Plus,
  Compass,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const [userTeams, recentTournaments, activeTournamentCount] =
    await Promise.all([
      db
        .select({
          id: teams.id,
          slug: teams.slug,
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
      db
        .select({ value: count() })
        .from(tournaments)
        .where(
          or(
            eq(tournaments.status, "in_progress"),
            eq(tournaments.status, "registration_open"),
            gte(tournaments.endDate, today)
          )
        ),
    ]);

  const firstName = user.fullName.split(" ")[0];
  const isNewUser = userTeams.length === 0 && recentTournaments.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening on PoolPlay.
        </p>
      </div>

      {isNewUser ? (
        <Card className="border-dashed">
          <CardContent className="py-10">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-xl font-semibold">Get started</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first team, run a tournament, or explore what other
                clubs are up to.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Link
                  href="/teams/new"
                  className="group flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Create a team</span>
                  <span className="text-xs text-muted-foreground">
                    Add your roster and set up invites.
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Start
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
                <Link
                  href="/tournaments/new"
                  className="group flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-medium">Run a tournament</span>
                  <span className="text-xs text-muted-foreground">
                    Configure divisions, courts, and brackets.
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Start
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
                <Link
                  href="/explore"
                  className="group flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <Compass className="h-5 w-5 text-secondary" />
                  <span className="font-medium">Browse tournaments</span>
                  <span className="text-xs text-muted-foreground">
                    See what&apos;s happening across clubs.
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-secondary">
                    Explore
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="My Teams"
            value={userTeams.length}
            icon={Users}
          />
          <StatCard
            label="Active Tournaments"
            value={activeTournamentCount[0].value}
            icon={Trophy}
          />
          <StatCard
            label="Recent Tournaments"
            value={recentTournaments.length}
            icon={Calendar}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Teams</CardTitle>
            <Link
              href="/teams/new"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Team
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {userTeams.length === 0 ? (
              <EmptyState
                variant="inline"
                icon={Users}
                title="No teams yet"
                description="Create a team to manage your roster and register for tournaments."
              />
            ) : (
              <div className="space-y-2">
                {userTeams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.slug}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{team.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {team.university}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-3 shrink-0">
                      {team.role}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Tournaments</CardTitle>
            <Link
              href="/tournaments/new"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Tournament
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recentTournaments.length === 0 ? (
              <EmptyState
                variant="inline"
                icon={Trophy}
                title="No tournaments yet"
                description="Once tournaments are created, they&apos;ll show up here."
              />
            ) : (
              <div className="space-y-2">
                {recentTournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.slug}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {t.location}
                        <span className="mx-1.5">&middot;</span>
                        {t.startDate}
                      </p>
                    </div>
                    <Badge
                      variant={
                        t.status === "in_progress" ? "default" : "secondary"
                      }
                      className="ml-3 shrink-0"
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
