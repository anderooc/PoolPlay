import { db } from "@/lib/db";
import { teams, teamMembers } from "@/lib/db/schema";
import { asc, count, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamRow } from "./team-row";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      university: teams.university,
      season: teams.season,
      memberCount: count(teamMembers.id),
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .groupBy(teams.id)
    .orderBy(asc(teams.name));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Teams</h2>
        <p className="text-sm text-muted-foreground">
          Rename or delete any team. Deleting cascades to memberships and
          tournament registrations.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>University</TableHead>
              <TableHead>Season</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TeamRow key={t.id} team={t} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
