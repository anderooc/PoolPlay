/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentAuthProfile } from "@/lib/auth";
import { pageMetadata } from "@/lib/metadata";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";

export const metadata = pageMetadata(
  "About",
  "Why PoolPlay exists: built by Andrew Chang from running Emory club volleyball tournaments without the right tools."
);

export default async function AboutPage() {
  const user = await getCurrentAuthProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />

      <main className="relative flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 text-foreground/[0.05] bg-dot-grid [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-40 -z-10 h-64 w-64 rounded-full bg-secondary/15 blur-3xl"
        />

        <article className="container mx-auto max-w-3xl px-4 py-16 sm:py-20">
          <header className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              About PoolPlay
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Built from running tournaments the hard way
            </h1>
            <p className="max-w-2xl text-pretty text-lg text-muted-foreground">
              I created PoolPlay after years as president of Emory Club
              Volleyball, hosting and traveling to tournaments that were held
              together by spreadsheets, group chats, and too many last-minute
              fixes.
            </p>
          </header>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-foreground/90">
            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                What it was like at Emory
              </h2>
              <p className="text-pretty">
                Club volleyball is one of the best parts of college sports. Teams
                arrive early, compete all day, and care deeply about getting every
                match right. As club president, I experienced the other side too:
                organizing pools, building brackets, collecting rosters, assigning
                courts, and keeping scores accurate while answering the same
                questions across multiple chats.
              </p>
              <p className="text-pretty">
                The tournaments themselves were great. The tools were not.
              </p>
              <p className="text-pretty">
                Every event depended on a patchwork of Google Sheets, shared Docs,
                Instagram posts, GroupMe messages, and verbal updates that never
                reached everyone who needed them. When something changed on court,
                captains, players, and spectators often found out last.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Why I built PoolPlay
              </h2>
              <p className="text-pretty">
                Those frustrations weren&apos;t unique to Emory. Nearly every
                collegiate club tournament I attended followed the same pattern:
                dedicated hosts trying to run great events with tools that were
                never designed for tournament day.
              </p>
              <p className="text-pretty">
                Instead of focusing on the competition, organizers spent hours
                rebuilding the same systems from scratch and solving avoidable
                problems throughout the weekend.
              </p>
              <p className="text-pretty">PoolPlay is my answer to that.</p>
              <p className="text-pretty">
                I wanted a single platform for hosts to manage registration,
                build divisions, generate pools and brackets, schedule courts, and
                update live scores—without worrying about whether everyone has the
                latest spreadsheet.
              </p>
              <p className="text-pretty">
                I wanted captains to be able to register their teams, manage rosters, and
                always know where they&apos;re playing next. I wanted players and
                spectators to refresh one page and trust that the information
                they&apos;re seeing is accurate.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                What I&apos;m building toward
              </h2>
              <p className="text-pretty">
                PoolPlay is built for collegiate club volleyball first because
                that&apos;s the community I know best.
              </p>
              <p className="text-pretty">
                The goal isn&apos;t to create another generic tournament platform.
                It&apos;s to build software that understands how our tournaments
                actually operate: early mornings, limited courts, tight turnarounds
                between pools and playoffs, and hosts who are often players or
                alumni volunteering their weekends to make the event happen.
              </p>
              <p className="text-pretty">
                If PoolPlay can save a host from a stressful Saturday morning, make
                a tournament run a little smoother, or help one team find the right
                court at the right time, then it&apos;s accomplishing exactly what
                it was built to do.
              </p>
            </section>
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-border/70 pt-10 sm:flex-row sm:items-center">
            <Link
              href="/explore"
              className={buttonVariants({
                size: "lg",
                className: "group h-11 px-6 text-sm",
              })}
            >
              Browse tournaments
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!user ? (
              <Link
                href="/signup"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "h-11 px-6 text-sm",
                })}
              >
                Create account
              </Link>
            ) : null}
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Andrew Chang
            <span className="mx-2 text-border">/</span>
            Founder
            <span className="mx-2 text-border">/</span>
            Former president, Emory Club Volleyball
          </p>
        </article>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
