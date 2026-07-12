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
import { contentFlags, users } from "@/lib/db/schema";
import { count, desc, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FlagRow } from "../flags/flag-row";
import { AdminTablePagination } from "../admin-table-pagination";
import { ADMIN_TABLE_PAGE_SIZE } from "../constants";

export async function AdminFlagsPanel({ page }: { page: number }) {
  const requestedPage = page;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(contentFlags);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_TABLE_PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);

  const rows = await db
    .select({
      id: contentFlags.id,
      area: contentFlags.area,
      text: contentFlags.text,
      blockedWord: contentFlags.blockedWord,
      resolvedAt: contentFlags.resolvedAt,
      createdAt: contentFlags.createdAt,
      userId: contentFlags.userId,
      userEmail: users.email,
      userName: users.fullName,
    })
    .from(contentFlags)
    .leftJoin(users, eq(contentFlags.userId, users.id))
    .orderBy(desc(contentFlags.createdAt))
    .limit(ADMIN_TABLE_PAGE_SIZE)
    .offset((safePage - 1) * ADMIN_TABLE_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Content flags</h2>
        <p className="text-sm text-muted-foreground">
          Recorded every time the content filter rejected user input. Resolve
          entries you&apos;ve reviewed, or delete them to clear the log.{" "}
          <span className="text-muted-foreground/90">
            ({ADMIN_TABLE_PAGE_SIZE} per page.)
          </span>
        </p>
      </div>

      {total === 0 ? (
        <p className="rounded-md border border-border/80 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No flagged content yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>Triggered</TableHead>
                <TableHead>Text</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <FlagRow
                  key={row.id}
                  flag={{
                    id: row.id,
                    area: row.area,
                    text: row.text,
                    blockedWord: row.blockedWord,
                    resolvedAt: row.resolvedAt
                      ? row.resolvedAt.toISOString()
                      : null,
                    createdAt: row.createdAt.toISOString(),
                    userEmail: row.userEmail,
                    userName: row.userName,
                  }}
                />
              ))}
            </TableBody>
          </Table>
          <AdminTablePagination
            tab="flags"
            page={safePage}
            pageSize={ADMIN_TABLE_PAGE_SIZE}
            total={total}
          />
        </div>
      )}
    </div>
  );
}
