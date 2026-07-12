/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tournaments, teams, teamMembers } from "@/lib/db/schema";
import { eq, desc, count, gte, or } from "drizzle-orm";
import { todayISO } from "@/lib/tournament-status";
import {
  filterVisibleTournaments,
  getUserSchoolIds,
} from "@/lib/tournaments/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
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
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Dashboard");

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = todayISO();

  const [userTeams, recentTournamentRows, activeTournamentCount, userSchoolIds] =
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
            gte(tournaments.date, today)
          )
        ),
      getUserSchoolIds(user.id),
    ]);

  const recentTournaments = filterVisibleTournaments(
    recentTournamentRows,
    user,
    userSchoolIds
  );

  const firstName = user.fullName.split(" ")[0];
  const isNewUser = userTeams.length === 0 && recentTournaments.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening on PoolPlay."
      />

      {isNewUser ? (
        <Card className="relative overflow-hidden border-dashed">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 text-foreground/[0.05] bg-dot-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]"
          />
          <CardContent className="relative py-10">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                Get started
              </h2>
              <p className="mt-2 text-pretty text-sm text-muted-foreground">
                Create your first team, run a tournament, or explore what other
                clubs are up to.
              </p>
              <div className="mt-6 grid divide-y border border-border/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <Link
                  href="/teams/new"
                  className="group flex flex-col items-start gap-1 p-4 text-left transition-colors duration-150 hover:bg-muted/40"
                >
                  <Users className="h-4 w-4 text-primary" />
                  <span className="mt-2 font-medium">Create a team</span>
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
                  className="group flex flex-col items-start gap-1 p-4 text-left transition-colors duration-150 hover:bg-muted/40"
                >
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="mt-2 font-medium">Run a tournament</span>
                  <span className="text-xs text-muted-foreground">
                    Configure pools, courts, and brackets.
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Start
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
                <Link
                  href="/explore"
                  className="group flex flex-col items-start gap-1 p-4 text-left transition-colors duration-150 hover:bg-muted/40"
                >
                  <Compass className="h-4 w-4 text-secondary" />
                  <span className="mt-2 font-medium">Browse tournaments</span>
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
            accent="primary"
          />
          <StatCard
            label="Active Tournaments"
            value={activeTournamentCount[0].value}
            icon={Trophy}
            accent="secondary"
          />
          <StatCard
            label="Recent Tournaments"
            value={recentTournaments.length}
            icon={Calendar}
            accent="primary"
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
              <div className="list-stack">
                {userTeams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.slug}`}
                    className="list-row"
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
              <div className="list-stack">
                {recentTournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.slug}`}
                    className="list-row"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {t.location}
                        <span className="mx-1.5">&middot;</span>
                        {t.date}
                      </p>
                    </div>
                    <StatusBadge
                      kind="tournament"
                      status={t.status}
                      date={t.date}
                      className="ml-3 shrink-0"
                    />
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
  accent = "primary",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "secondary";
}) {
  const accentClasses =
    accent === "primary"
      ? "from-primary/15 to-primary/5 text-primary"
      : "from-secondary/15 to-secondary/5 text-secondary";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br ${accentClasses} ring-1 ring-inset ring-border/60`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="font-heading text-3xl font-bold tracking-tight">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
