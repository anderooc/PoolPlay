import { db } from "@/lib/db";
import { tournaments, users } from "@/lib/db/schema";
import { asc, count, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
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

      <div className="rounded-md border">
        <Table>
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
            {rows.map((t) => (
              <TournamentRow key={t.id} tournament={t} />
            ))}
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
