import { redirect } from "next/navigation";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schoolMembers, schools, teams } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, CheckCircle2, Plus } from "lucide-react";
import { SCHOOL_VERIFICATION_STATUS_LABELS } from "@/lib/constants/school";
import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Schools
          </h1>
          <p className="mt-1 text-muted-foreground">
            Browse club programs. Schools manage rosters and host their
            men&apos;s and women&apos;s teams from one place.
          </p>
        </div>
        <Link
          href="/schools/new"
          className={buttonVariants({ className: "w-full sm:w-auto" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          New school
        </Link>
      </div>

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
              <Card className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
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
                    <Badge
                      variant={
                        school.verificationStatus === "verified"
                          ? "default"
                          : school.verificationStatus === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="gap-1"
                    >
                      {school.verificationStatus === "verified" && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {SCHOOL_VERIFICATION_STATUS_LABELS[school.verificationStatus]}
                    </Badge>
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
