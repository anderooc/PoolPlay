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
import { teams, teamMembers } from "@/lib/db/schema";
import { asc, count, eq, isNull, sql } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamRow } from "../teams/team-row";
import { AdminTablePagination } from "../admin-table-pagination";
import { ADMIN_TABLE_PAGE_SIZE } from "../constants";

export async function AdminTeamsPanel({ page }: { page: number }) {
  const requestedPage = page;

  const [{ value: standaloneTotal }] = await db
    .select({ value: count() })
    .from(teams)
    .where(isNull(teams.schoolId));

  const standalonePages = Math.max(
    1,
    Math.ceil(standaloneTotal / ADMIN_TABLE_PAGE_SIZE)
  );
  const safePage = Math.min(requestedPage, standalonePages);

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      university: teams.university,
      schoolId: teams.schoolId,
      verificationStatus: teams.verificationStatus,
      memberCount: count(teamMembers.id),
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(isNull(teams.schoolId))
    .groupBy(teams.id)
    .orderBy(
      sql`CASE ${teams.verificationStatus}
        WHEN 'pending' THEN 0
        WHEN 'rejected' THEN 1
        WHEN 'verified' THEN 2
        ELSE 3 END`,
      asc(teams.name)
    )
    .limit(ADMIN_TABLE_PAGE_SIZE)
    .offset((safePage - 1) * ADMIN_TABLE_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Standalone teams
        </h2>
        <p className="text-sm text-muted-foreground">
          Approve or reject teams that are not linked to a school. School-linked
          teams are approved through their school&apos;s verification. Pending
          review is listed first.{" "}
          <span className="text-muted-foreground/90">
            ({ADMIN_TABLE_PAGE_SIZE} per page.)
          </span>
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>University</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Members</TableHead>
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
                  No standalone teams yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => <TeamRow key={t.id} team={t} />)
            )}
          </TableBody>
        </Table>
        <AdminTablePagination
          tab="teams"
          page={safePage}
          pageSize={ADMIN_TABLE_PAGE_SIZE}
          total={standaloneTotal}
        />
      </div>
    </div>
  );
}
