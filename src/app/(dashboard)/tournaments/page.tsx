import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { TournamentGrid } from "@/components/tournament-grid";

export default async function TournamentsPage() {
  const allTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.startDate));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground">
            Browse and manage volleyball tournaments.
          </p>
        </div>
        <Link href="/tournaments/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          New Tournament
        </Link>
      </div>

      <TournamentGrid tournaments={allTournaments} />
    </div>
  );
}
