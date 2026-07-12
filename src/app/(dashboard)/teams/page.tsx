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
import { schools, teams, teamMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, Plus, Users } from "lucide-react";
import { isStandaloneTeam } from "@/lib/teams/verification";
import Link from "next/link";
import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Teams");

export default async function TeamsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userTeams = await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      university: teams.university,
      gender: teams.gender,
      region: teams.region,
      role: teamMembers.role,
      schoolName: schools.name,
      schoolSlug: schools.slug,
      schoolId: teams.schoolId,
      verificationStatus: teams.verificationStatus,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teamMembers.userId, user.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Manage your club volleyball teams."
        actions={
          <Link
            href="/teams/new"
            className={buttonVariants({ className: "w-full sm:w-auto" })}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Team
          </Link>
        }
      />

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
              <Card className="h-full cursor-pointer transition-colors duration-150 hover:bg-muted/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">
                      {team.name}
                    </CardTitle>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="secondary">{team.role}</Badge>
                      {isStandaloneTeam(team.schoolId) &&
                        team.verificationStatus !== "verified" && (
                          <StatusBadge
                            kind="verification"
                            status={team.verificationStatus}
                          />
                        )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {team.university}
                  </p>
                  {team.schoolName && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {team.schoolName}
                    </p>
                  )}
                  <TeamAttributesBadges
                    gender={team.gender}
                    region={team.region}
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
