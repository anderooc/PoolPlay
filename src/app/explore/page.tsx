import Link from "next/link";
import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TournamentGrid } from "@/components/tournament-grid";

export default async function ExplorePage() {
  const allTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.startDate));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold text-lg tracking-tight"
          >
            <span className="text-primary">Pool</span>
            <span className="text-secondary">Play</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ size: "sm" })}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
            <p className="text-muted-foreground mt-1">
              Browse upcoming and ongoing collegiate club volleyball tournaments.
            </p>
          </div>

          <TournamentGrid
            tournaments={allTournaments}
            linkPrefix="/tournaments"
          />
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        PoolPlay
      </footer>
    </div>
  );
}
