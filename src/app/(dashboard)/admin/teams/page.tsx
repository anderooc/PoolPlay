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

  const [{ value: standaloneTotal }] = await db
    .select({ value: count() })
    .from(teams)
    .where(isNull(teams.schoolId));

  const standalonePages = Math.max(
    1,
    Math.ceil(standaloneTotal / ADMIN_TABLE_PAGE_SIZE)
  );
  const page = Math.min(requestedPage, standalonePages);

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
    .offset((page - 1) * ADMIN_TABLE_PAGE_SIZE);

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

      <div className="rounded-md border">
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
          basePath="/admin/teams"
          page={page}
          pageSize={ADMIN_TABLE_PAGE_SIZE}
          total={standaloneTotal}
        />
      </div>
    </div>
  );
}
