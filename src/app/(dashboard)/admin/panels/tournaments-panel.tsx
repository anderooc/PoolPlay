/*
 * ShootSet - Collegiate club volleyball tournament hub
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
import { tournaments, users } from "@/lib/db/schema";
import { asc, count, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TournamentRow } from "../tournaments/tournament-row";
import { AdminTablePagination } from "../admin-table-pagination";
import { ADMIN_TABLE_PAGE_SIZE } from "../constants";

export async function AdminTournamentsPanel({ page }: { page: number }) {
  const requestedPage = page;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(tournaments);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_TABLE_PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);

  const rows = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      status: tournaments.status,
      date: tournaments.date,
      location: tournaments.location,
      organizerId: tournaments.organizerId,
      organizerName: users.fullName,
      organizerEmail: users.email,
    })
    .from(tournaments)
    .leftJoin(users, eq(tournaments.organizerId, users.id))
    .orderBy(asc(tournaments.name))
    .limit(ADMIN_TABLE_PAGE_SIZE)
    .offset((safePage - 1) * ADMIN_TABLE_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Tournaments</h2>
        <p className="text-sm text-muted-foreground">
          Edit any tournament regardless of who created it.{" "}
          <span className="text-muted-foreground/90">
            ({ADMIN_TABLE_PAGE_SIZE} per page.)
          </span>
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-border/80">
        <Table className="table-fixed">
          <colgroup>
            <col />
            <col className="w-[7.5rem]" />
            <col />
            <col className="w-[13.5rem]" />
            <col className="w-48" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Tournament</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Organizer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No tournaments yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => <TournamentRow key={t.id} tournament={t} />)
            )}
          </TableBody>
        </Table>
        <AdminTablePagination
          tab="tournaments"
          page={safePage}
          pageSize={ADMIN_TABLE_PAGE_SIZE}
          total={total}
        />
      </div>
    </div>
  );
}
