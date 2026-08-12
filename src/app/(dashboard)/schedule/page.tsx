/*
 * brackt - Collegiate club volleyball tournament hub
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

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, tournaments } from "@/lib/db/schema";
import { eq, isNotNull, asc } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarClock } from "lucide-react";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ScheduleControls } from "./schedule-controls";
import { enrichScheduledMatches } from "@/lib/schedule/enrich-scheduled-matches";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Schedule");

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [scheduledMatches, userTournaments] = await Promise.all([
    db
      .select()
      .from(matches)
      .where(isNotNull(matches.scheduledTime))
      .orderBy(asc(matches.scheduledTime)),
    db
      .select({ id: tournaments.id, name: tournaments.name })
      .from(tournaments)
      .where(eq(tournaments.organizerId, user.id)),
  ]);

  const enrichedMatches = await enrichScheduledMatches(scheduledMatches);

  const byDate = new Map<string, typeof enrichedMatches>();
  for (const match of enrichedMatches) {
    const dateKey = match.scheduledTime
      ? format(match.scheduledTime, "yyyy-MM-dd")
      : "unscheduled";
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(match);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Schedule"
        description="View all scheduled matches across tournaments."
      />

      {userTournaments.length > 0 ? (
        <ScheduleControls tournaments={userTournaments} />
      ) : null}

      {enrichedMatches.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No scheduled matches yet"
          description="Create a tournament and generate pools or brackets, then auto-schedule to see matches here."
        />
      ) : (
        <div className="space-y-8">
          {[...byDate.entries()].map(([dateKey, dayMatches]) => (
            <section key={dateKey} className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {dateKey === "unscheduled"
                  ? "Unscheduled"
                  : format(
                      new Date(dateKey + "T00:00:00"),
                      "EEE, MMM d, yyyy"
                    )}
              </h2>
              <div className="list-stack border-y border-border/70">
                {dayMatches.map((match) => {
                  const meta = [
                    match.courtName,
                    match.contextLabel || null,
                    match.refTeamName ? `Ref ${match.refTeamName}` : null,
                  ].filter(Boolean);

                  return (
                    <div
                      key={match.id}
                      className="flex flex-col gap-2.5 px-1 py-3.5 transition-colors duration-150 ease-out hover:bg-muted/45 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                        <div className="flex items-start justify-between gap-3 sm:contents">
                          {match.scheduledTime ? (
                            <div className="flex shrink-0 flex-col sm:w-[4.5rem] sm:items-end">
                              <span className="text-sm font-medium tabular-nums text-foreground sm:text-muted-foreground">
                                {format(match.scheduledTime, "h:mm a")}
                              </span>
                              {match.warmupStart ? (
                                <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground/70">
                                  Warmup {format(match.warmupStart, "h:mm")}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          <StatusBadge
                            kind="match"
                            status={match.status}
                            className="shrink-0 sm:hidden"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium leading-snug sm:truncate">
                            {match.teamAName}
                            <span className="text-muted-foreground"> vs </span>
                            {match.teamBName}
                          </p>
                          {meta.length > 0 ? (
                            <p className="text-sm text-muted-foreground sm:truncate">
                              {meta.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <StatusBadge
                        kind="match"
                        status={match.status}
                        className="hidden shrink-0 self-center sm:inline-flex"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
