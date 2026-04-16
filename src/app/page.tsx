import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HeaderNav } from "@/components/layout/header-nav";
import { PoolPlayMark } from "@/components/layout/poolplay-mark";
import { Trophy, Users, Calendar, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <PoolPlayMark href="/" wordmarkClassName="text-lg" />
            <HeaderNav />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className={buttonVariants()}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Sign In
                </Link>
                <Link href="/signup" className={buttonVariants()}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-14 text-center sm:py-20">
          <div className="mx-auto max-w-4xl rounded-3xl border bg-white/90 px-5 py-10 shadow-md shadow-secondary/5 sm:px-8 sm:py-12 md:px-10">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              <PoolPlayMark
                wordmarkClassName="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight"
              />
              <br />
              <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Collegiate club volleyball
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              The all-in-one platform for organizing tournaments, managing teams,
              and tracking live scores for college club volleyball.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className={buttonVariants({ size: "lg" })}
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className={buttonVariants({ size: "lg" })}
                >
                  Create Account
                </Link>
              )}
              <Link
                href="/explore"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Browse Tournaments
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="container mx-auto grid gap-5 px-4 py-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {[
              {
                icon: Trophy,
                title: "Tournament Management",
                desc: "Create and manage tournaments with divisions, pools, and brackets.",
              },
              {
                icon: Users,
                title: "Team Registration",
                desc: "Register your club team, manage rosters, and sign up for events.",
              },
              {
                icon: Calendar,
                title: "Smart Scheduling",
                desc: "Auto-generate schedules with court assignments and time slots.",
              },
              {
                icon: Zap,
                title: "Live Scoring",
                desc: "Real-time score updates so everyone can follow the action.",
              },
            ].map((feature, idx) => (
              <div
                key={feature.title}
                className="space-y-2 rounded-2xl border bg-white/85 p-5 transition-shadow hover:shadow-md"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    idx % 2 === 0
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <PoolPlayMark wordmarkClassName="text-sm font-bold" />
      </footer>
    </div>
  );
}
