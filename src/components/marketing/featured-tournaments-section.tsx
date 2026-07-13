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
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import { TournamentHostSchoolLink } from "@/components/tournament-host-school-link";
import {
  formatTournamentDateDisplay,
  parseISODate,
} from "@/lib/date-iso";
import {
  getFeaturedTournaments,
  type FeaturedTournament,
} from "@/lib/marketing/featured-tournaments";
import { cn } from "@/lib/utils";

function formatDateParts(date: string) {
  const parsed = parseISODate(date);
  return {
    month: parsed.toLocaleDateString(undefined, { month: "short" }),
    day: parsed.getDate(),
    weekday: parsed.toLocaleDateString(undefined, { weekday: "short" }),
  };
}

function TournamentTile({
  tournament,
  variant = "compact",
}: {
  tournament: FeaturedTournament;
  variant?: "hero" | "compact" | "rail";
}) {
  const parts = formatDateParts(tournament.date);
  const isHero = variant === "hero";

  return (
    <Link
      href={`/explore/tournaments/${tournament.slug}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 motion-safe:active:scale-[0.995]",
        isHero
          ? "min-h-[18rem] rounded-3xl bg-court-mesh p-8 ring-1 ring-border/60 sm:min-h-[20rem] sm:p-10"
          : variant === "rail"
            ? "min-w-[17.5rem] snap-start rounded-2xl bg-muted/35 p-5 ring-1 ring-border/50 sm:min-w-[19rem]"
            : "rounded-2xl bg-muted/30 p-5 ring-1 ring-border/50"
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute rounded-full bg-primary/15 blur-3xl transition-opacity duration-300 group-hover:opacity-100",
          isHero
            ? "-right-16 -top-16 h-56 w-56 opacity-80"
            : "-right-10 -top-10 h-32 w-32 opacity-50"
        )}
      />

      <div className="relative flex flex-1 flex-col gap-4">
        <div
          className={cn(
            "flex gap-4",
            isHero ? "items-start" : "items-center"
          )}
        >
          <div
            className={cn(
              "flex shrink-0 flex-col items-center justify-center rounded-2xl bg-background/80 font-heading tabular-nums ring-1 ring-border/60 backdrop-blur-sm",
              isHero ? "h-20 w-20" : "h-14 w-14"
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {parts.month}
            </span>
            <span
              className={cn(
                "font-bold leading-none text-gradient-brand",
                isHero ? "text-3xl" : "text-2xl"
              )}
            >
              {parts.day}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {parts.weekday}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h3
                className={cn(
                  "min-w-0 text-pretty font-heading font-semibold leading-snug transition-colors group-hover:text-primary",
                  isHero ? "text-2xl sm:text-3xl" : "text-lg"
                )}
              >
                {tournament.name}
              </h3>
              <StatusBadge
                kind="tournament"
                status={tournament.status}
                date={tournament.date}
                className="shrink-0"
              />
            </div>
            {!isHero && (
              <p className="text-sm text-muted-foreground">
                {formatTournamentDateDisplay(tournament.date, {
                  weekday: true,
                })}
              </p>
            )}
          </div>
        </div>

        <div
          className={cn(
            "space-y-2 text-sm text-muted-foreground",
            isHero && "mt-auto border-t border-border/50 pt-5"
          )}
        >
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className={isHero ? "text-base" : "truncate"}>
              {tournament.location}
            </span>
          </p>
          {tournament.teamCount > 0 && (
            <p className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {tournament.teamCount}{" "}
              {tournament.teamCount === 1 ? "team" : "teams"} registered
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <TeamAttributesBadges
            gender={tournament.gender}
            region={tournament.region}
          />
          <TournamentHostSchoolLink
            school={tournament.hostSchool}
            asLink={false}
          />
        </div>
      </div>
    </Link>
  );
}

export async function FeaturedTournamentsSection() {
  const tournaments = await getFeaturedTournaments(6);
  const [lead, ...rest] = tournaments;
  const sidebar = rest.slice(0, 2);
  const rail = rest.slice(2);

  return (
    <section
      className="relative overflow-hidden border-t bg-background"
      aria-labelledby="featured-tournaments-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-secondary/10 blur-3xl"
      />
      <div className="container relative mx-auto px-4 py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              id="featured-tournaments-heading"
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Upcoming tournaments
            </h2>
            <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
              Real events on PoolPlay right now. Registration, schedules, and
              scores in one place.
            </p>
          </div>
          <Link
            href="/explore"
            className={buttonVariants({
              variant: "outline",
              className: "w-full shrink-0 sm:w-auto",
            })}
          >
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="mt-12 rounded-3xl bg-muted/25 px-6 py-14 text-center ring-1 ring-border/50">
            <Calendar
              className="mx-auto h-10 w-10 text-muted-foreground/50"
              aria-hidden
            />
            <p className="mt-4 text-base font-medium">No public tournaments yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              New events appear here as hosts publish them. Check back soon or
              start your own.
            </p>
            <Link
              href="/explore"
              className={buttonVariants({
                variant: "outline",
                className: "mt-6",
              })}
            >
              Go to explore
            </Link>
          </div>
        ) : tournaments.length === 1 && lead ? (
          <div className="mt-12">
            <TournamentTile tournament={lead} variant="hero" />
          </div>
        ) : (
          <div className="mt-12 space-y-4">
            <div className="grid gap-4 lg:grid-cols-12">
              {lead && (
                <div className="lg:col-span-7">
                  <TournamentTile tournament={lead} variant="hero" />
                </div>
              )}
              {sidebar.length > 0 && (
                <div className="flex flex-col gap-4 lg:col-span-5">
                  {sidebar.map((tournament) => (
                    <TournamentTile
                      key={tournament.id}
                      tournament={tournament}
                      variant="compact"
                    />
                  ))}
                </div>
              )}
            </div>

            {rail.length > 0 && (
              <div
                className="marketing-scroll-rail -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 pt-1 snap-x snap-mandatory lg:mx-0 lg:px-0"
              >
                {rail.map((tournament) => (
                  <TournamentTile
                    key={tournament.id}
                    tournament={tournament}
                    variant="rail"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
