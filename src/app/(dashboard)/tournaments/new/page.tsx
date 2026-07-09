import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserHostingSchool } from "@/lib/schools/hosting";
import { NewTournamentForm } from "./new-tournament-form";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("New tournament");

export default async function NewTournamentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hostSchool = await getUserHostingSchool(user.id);

  return <NewTournamentForm hostSchool={hostSchool} />;
}
