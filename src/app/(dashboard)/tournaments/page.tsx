import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { TournamentGrid } from "@/components/tournament-grid";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const allTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.startDate));

  return (
    <div className="space-y-6">
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

      <TournamentGrid tournaments={allTournaments} />
    </div>
  );
}
