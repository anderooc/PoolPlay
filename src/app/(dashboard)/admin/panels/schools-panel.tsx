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
import { schoolMembers, schools, teams, users } from "@/lib/db/schema";
import { asc, count, eq, sql } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SchoolRow } from "../schools/school-row";
import { AdminTablePagination } from "../admin-table-pagination";
import { ADMIN_TABLE_PAGE_SIZE } from "../constants";

export async function AdminSchoolsPanel({ page }: { page: number }) {
  const requestedPage = page;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(schools);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_TABLE_PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);

  const presidentSubquery = db
    .select({
      schoolId: schoolMembers.schoolId,
      presidentName: users.fullName,
      presidentEmail: users.email,
    })
    .from(schoolMembers)
    .innerJoin(users, eq(schoolMembers.userId, users.id))
    .where(eq(schoolMembers.role, "president"))
    .as("p");

  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      slug: schools.slug,
      university: schools.university,
      verificationStatus: schools.verificationStatus,
      domainHint: schools.domainHint,
      domainMatched: schools.domainMatched,
      createdAt: schools.createdAt,
      presidentName: presidentSubquery.presidentName,
      presidentEmail: presidentSubquery.presidentEmail,
      officerCount: sql<number>`COUNT(DISTINCT ${schoolMembers.id}) FILTER (WHERE ${schoolMembers.role} = 'officer')`,
      teamCount: count(teams.id),
    })
    .from(schools)
    .leftJoin(presidentSubquery, eq(presidentSubquery.schoolId, schools.id))
    .leftJoin(schoolMembers, eq(schoolMembers.schoolId, schools.id))
    .leftJoin(teams, eq(teams.schoolId, schools.id))
    .groupBy(
      schools.id,
      presidentSubquery.presidentName,
      presidentSubquery.presidentEmail
    )
    .orderBy(
      sql`CASE ${schools.verificationStatus}
        WHEN 'pending' THEN 0
        WHEN 'rejected' THEN 1
        WHEN 'verified' THEN 2
        ELSE 3 END`,
      asc(schools.name)
    )
    .limit(ADMIN_TABLE_PAGE_SIZE)
    .offset((safePage - 1) * ADMIN_TABLE_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Schools</h2>
        <p className="text-sm text-muted-foreground">
          Approve or reject club verification requests. Schools are listed
          with pending review first.{" "}
          <span className="text-muted-foreground/90">
            ({ADMIN_TABLE_PAGE_SIZE} per page.)
          </span>
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-border/80">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[22%]" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-[11rem]" />
            <col className="w-72" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>President</TableHead>
              <TableHead className="text-right">Officers</TableHead>
              <TableHead className="text-right">Teams</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <SchoolRow key={s.id} school={s} />
            ))}
          </TableBody>
        </Table>
        <AdminTablePagination
          tab="schools"
          page={safePage}
          pageSize={ADMIN_TABLE_PAGE_SIZE}
          total={total}
        />
      </div>
    </div>
  );
}
