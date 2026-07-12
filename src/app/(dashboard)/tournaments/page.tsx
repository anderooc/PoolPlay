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

import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
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
import { tournamentListColumns } from "@/lib/tournaments/list-columns";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Tournaments");

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [allTournaments, userSchoolIds] = await Promise.all([
    db.select(tournamentListColumns).from(tournaments).orderBy(asc(tournaments.date)),
    getUserSchoolIds(user.id),
  ]);

  const visibleTournaments = await enrichTournamentsWithHostSchools(
    filterVisibleTournaments(allTournaments, user, userSchoolIds)
  );

  return (
    <div className="flex h-full min-w-0 flex-col gap-6 overflow-x-hidden">
      <PageHeader
        title="Tournaments"
        description="Browse and manage volleyball tournaments."
        actions={
          <Link
            href="/tournaments/new"
            className={buttonVariants({ className: "w-full sm:w-auto" })}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
          </Link>
        }
      />

      <TournamentGrid tournaments={visibleTournaments} />
    </div>
  );
}
