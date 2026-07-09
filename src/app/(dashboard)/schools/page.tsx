import { redirect } from "next/navigation";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schoolMembers, schools, teams } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, Plus } from "lucide-react";
import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Schools");

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // A user can only belong to one school. If they already have one, send
  // them to it — this page acts as the "no school yet" landing.
  const [mySchool] = await db
    .select({ slug: schools.slug })
    .from(schoolMembers)
    .innerJoin(schools, eq(schools.id, schoolMembers.schoolId))
    .where(eq(schoolMembers.userId, user.id))
    .limit(1);
  if (mySchool) redirect(`/schools/${mySchool.slug}`);

  const rows = await db
    .select({
      id: schools.id,
      slug: schools.slug,
      name: schools.name,
      university: schools.university,
      gender: schools.gender,
      region: schools.region,
      verificationStatus: schools.verificationStatus,
      teamCount: count(teams.id),
    })
    .from(schools)
    .leftJoin(teams, eq(teams.schoolId, schools.id))
    .groupBy(schools.id)
    .orderBy(asc(schools.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schools"
        description="Browse club programs. Schools manage rosters and host their men's and women's teams from one place."
        actions={
          <Link
            href="/schools/new"
            className={buttonVariants({ className: "w-full sm:w-auto" })}
          >
            <Plus className="mr-2 h-4 w-4" />
            New school
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No schools yet"
          description="Create a school to manage all your club's teams and roster from one place."
          action={
            <Link href="/schools/new" className={buttonVariants()}>
              <Plus className="mr-2 h-4 w-4" />
              Create school
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((school) => (
            <Link key={school.id} href={`/schools/${school.slug}`}>
              <Card className="h-full cursor-pointer transition-colors duration-150 hover:bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg leading-tight">
                    {school.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {school.university}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {formatTeamGender(school.gender)}
                    </Badge>
                    <Badge variant="outline">
                      {formatTeamRegion(school.region)}
                    </Badge>
                    <StatusBadge
                      kind="verification"
                      status={school.verificationStatus}
                    />
                    <span className="text-xs text-muted-foreground">
                      {school.teamCount} team
                      {school.teamCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
