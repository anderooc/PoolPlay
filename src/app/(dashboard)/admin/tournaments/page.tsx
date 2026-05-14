import { db } from "@/lib/db";
import { tournaments, users } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TournamentRow } from "./tournament-row";

export const dynamic = "force-dynamic";

export default async function AdminTournamentsPage() {
  const rows = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      status: tournaments.status,
      startDate: tournaments.startDate,
      endDate: tournaments.endDate,
      location: tournaments.location,
      organizerId: tournaments.organizerId,
      organizerName: users.fullName,
      organizerEmail: users.email,
    })
    .from(tournaments)
    .leftJoin(users, eq(tournaments.organizerId, users.id))
    .orderBy(asc(tournaments.name));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Tournaments</h2>
        <p className="text-sm text-muted-foreground">
          Edit any tournament regardless of who created it.
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
      </div>
    </div>
  );
}
