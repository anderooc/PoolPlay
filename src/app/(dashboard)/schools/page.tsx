import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schools, teams } from "@/lib/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Plus } from "lucide-react";
import { getUserSchoolSummary } from "@/lib/schools/navigation";
import { pageMetadata } from "@/lib/metadata";
import { SchoolSearchGrid } from "./school-search-grid";

export const metadata = pageMetadata("Find schools");

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [mySchool, rows] = await Promise.all([
    getUserSchoolSummary(user.id),
    db
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
      .orderBy(asc(schools.name)),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find schools"
        description={
          mySchool
            ? "Browse other collegiate club programs on PoolPlay."
            : "Find your program below. A school president or officer must add you to their roster using your signup email — or create a new school if you're starting a program."
        }
        actions={
          mySchool ? (
            <Link
              href={`/schools/${mySchool.slug}`}
              className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
            >
              Your school · {mySchool.name}
            </Link>
          ) : (
            <Link
              href="/schools/new"
              className={buttonVariants({ className: "w-full sm:w-auto" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              New school
            </Link>
          )
        }
      />

      <SchoolSearchGrid schools={rows} />
    </div>
  );
}
