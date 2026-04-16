import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Trophy, Users, Calendar, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <span className="font-bold text-lg">PoolPlay</span>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Sign In
            </Link>
            <Link href="/signup" className={buttonVariants()}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-primary">PoolPlay</span>
            <br />
            <span className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
              Collegiate club volleyball
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            The all-in-one platform for organizing tournaments, managing teams,
            and tracking live scores for college club volleyball.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Create Account
            </Link>
            <Link href="/tournaments" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Browse Tournaments
            </Link>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="container mx-auto grid gap-8 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
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
            ].map((feature) => (
              <div key={feature.title} className="space-y-2">
                <feature.icon className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        PoolPlay
      </footer>
    </div>
  );
}
