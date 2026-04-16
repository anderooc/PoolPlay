import Link from "next/link";
import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { HeaderNav } from "@/components/layout/header-nav";
import { PoolPlayMark } from "@/components/layout/poolplay-mark";
import { createClient } from "@/lib/supabase/server";
import { TournamentGrid } from "@/components/tournament-grid";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.startDate));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <PoolPlayMark href="/" wordmarkClassName="text-lg" />
            <HeaderNav />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!user && (
              <>
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
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto space-y-8 px-4 py-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tournaments
            </h1>
            <p className="mt-2 text-muted-foreground">
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
        <PoolPlayMark wordmarkClassName="text-sm font-bold" />
      </footer>
    </div>
  );
}
