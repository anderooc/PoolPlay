import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRow } from "./user-row";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

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
    .orderBy(asc(users.fullName));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">
          Change roles or remove accounts. You are the current admin and
          can&apos;t demote yourself if you&apos;re the only one.
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
      </div>
    </div>
  );
}
