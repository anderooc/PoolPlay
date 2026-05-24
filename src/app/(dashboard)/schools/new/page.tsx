import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { schoolMembers, schools } from "@/lib/db/schema";
import { NewSchoolForm } from "./new-school-form";

export const dynamic = "force-dynamic";

export default async function NewSchoolPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Users can only belong to one school. If they already have one, send
  // them there instead of the create flow.
  const [mine] = await db
    .select({ slug: schools.slug })
    .from(schoolMembers)
    .innerJoin(schools, eq(schools.id, schoolMembers.schoolId))
    .where(eq(schoolMembers.userId, user.id))
    .limit(1);
  if (mine) redirect(`/schools/${mine.slug}`);

  return <NewSchoolForm />;
}
