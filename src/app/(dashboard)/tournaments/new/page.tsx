import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getHostingTeamOptions } from "@/lib/teams/hosting";
import { NewTournamentForm } from "./new-tournament-form";

export default async function NewTournamentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hostingTeams = await getHostingTeamOptions(user.id, isAdmin(user));

  return <NewTournamentForm hostingTeams={hostingTeams} />;
}
