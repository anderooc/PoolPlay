import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  schoolMembers,
  schools,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SmartBackLink } from "@/components/layout/smart-back-link";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { Building2, CheckCircle2 } from "lucide-react";
import { AddMemberForm } from "./add-member-form";
import { RosterRow } from "./roster-row";
import { TeamDeleteButton } from "./team-delete-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);
  if (!team) notFound();

  const id = team.id;

  const [members, schoolRow, mySchoolMembership] = await Promise.all([
    db
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
      .where(eq(teamMembers.teamId, id)),
    team.schoolId
      ? db
          .select({
            id: schools.id,
            name: schools.name,
            slug: schools.slug,
            verificationStatus: schools.verificationStatus,
          })
          .from(schools)
          .where(eq(schools.id, team.schoolId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    team.schoolId
      ? db
          .select({ role: schoolMembers.role })
          .from(schoolMembers)
          .where(
            and(
              eq(schoolMembers.schoolId, team.schoolId),
              eq(schoolMembers.userId, user.id)
            )
          )
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const currentMembership = members.find((m) => m.userId === user.id);
  const isCaptain =
    currentMembership?.role === "captain" ||
    isAdmin(user) ||
    mySchoolMembership?.role === "president" ||
    mySchoolMembership?.role === "officer";

  const backFallback = schoolRow
    ? `/schools/${schoolRow.slug}`
    : "/teams";

  return (
    <div className="space-y-6">
      <SmartBackLink fallbackHref={backFallback}>Back</SmartBackLink>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-muted-foreground">{team.university}</p>
          <TeamAttributesBadges
            gender={team.gender}
            region={team.region}
            className="mt-2"
          />
          {schoolRow && (
            <Link
              href={`/schools/${schoolRow.slug}`}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <Building2 className="h-3 w-3" />
              <span>Part of {schoolRow.name}</span>
              {schoolRow.verificationStatus === "verified" && (
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              )}
            </Link>
          )}
        </div>
        {isCaptain && (
          <TeamDeleteButton teamId={id} teamName={team.name} />
        )}
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
              {schoolRow && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Teams under a school can only add players from the
                  school&apos;s roster. Add new members at{" "}
                  <Link
                    href={`/schools/${schoolRow.slug}`}
                    className="underline underline-offset-4"
                  >
                    {schoolRow.name}
                  </Link>{" "}
                  first.
                </p>
              )}
              <AddMemberForm teamId={id} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
