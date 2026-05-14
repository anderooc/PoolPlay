import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { asc, count } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRow } from "./user-row";
import { AdminTablePagination } from "../admin-table-pagination";
import { ADMIN_TABLE_PAGE_SIZE } from "../constants";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();
  const sp = (await searchParams) ?? {};
  const rawPage = parseInt(sp.page ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(users);

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_TABLE_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      university: users.university,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.fullName))
    .limit(ADMIN_TABLE_PAGE_SIZE)
    .offset((page - 1) * ADMIN_TABLE_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">
          Change roles or remove accounts. You are the current admin and
          can&apos;t demote yourself if you&apos;re the only one.{" "}
          <span className="text-muted-foreground/90">
            ({ADMIN_TABLE_PAGE_SIZE} users per page.)
          </span>
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>University</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <UserRow
                key={u.id}
                user={{
                  ...u,
                  createdAt: u.createdAt.toISOString(),
                }}
                isSelf={u.id === currentUser?.id}
              />
            ))}
          </TableBody>
        </Table>
        <AdminTablePagination
          basePath="/admin/users"
          page={page}
          pageSize={ADMIN_TABLE_PAGE_SIZE}
          total={total}
        />
      </div>
    </div>
  );
}
