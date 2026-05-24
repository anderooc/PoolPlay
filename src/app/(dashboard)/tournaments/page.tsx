import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TournamentGrid } from "@/components/tournament-grid";
import { enrichTournamentsWithHostSchools } from "@/lib/tournaments/host-school";
import {
  filterVisibleTournaments,
  getUserSchoolIds,
} from "@/lib/tournaments/access";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [allTournaments, userSchoolIds] = await Promise.all([
    db.select().from(tournaments).orderBy(asc(tournaments.date)),
    getUserSchoolIds(user.id),
  ]);

  const visibleTournaments = await enrichTournamentsWithHostSchools(
    filterVisibleTournaments(allTournaments, user, userSchoolIds)
  );

  return (
    <div className="flex h-full min-w-0 flex-col gap-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tournaments
          </h1>
          <p className="mt-1 text-muted-foreground">
            Browse and manage volleyball tournaments.
          </p>
        </div>
        <Link
          href="/tournaments/new"
          className={buttonVariants({ className: "w-full sm:w-auto" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Tournament
        </Link>
      </div>

      <TournamentGrid tournaments={visibleTournaments} />
    </div>
  );
}
