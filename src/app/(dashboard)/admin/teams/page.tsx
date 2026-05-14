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
import { AdminTablePagination } from "../admin-table-pagination";
import { ADMIN_TABLE_PAGE_SIZE } from "../constants";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ page?: string }>;
}

export default async function AdminTeamsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const rawPage = parseInt(sp.page ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(teams);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_TABLE_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

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
    .orderBy(asc(teams.name))
    .limit(ADMIN_TABLE_PAGE_SIZE)
    .offset((page - 1) * ADMIN_TABLE_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Teams</h2>
        <p className="text-sm text-muted-foreground">
          Rename or delete any team. Deleting cascades to memberships and
          tournament registrations.{" "}
          <span className="text-muted-foreground/90">
            ({ADMIN_TABLE_PAGE_SIZE} per page.)
          </span>
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
        <AdminTablePagination
          basePath="/admin/teams"
          page={page}
          pageSize={ADMIN_TABLE_PAGE_SIZE}
          total={total}
        />
      </div>
    </div>
  );
}
