import { db } from "@/lib/db";
import { contentFlags, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FlagRow } from "./flag-row";

export const dynamic = "force-dynamic";

export default async function AdminFlagsPage() {
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
    .limit(200);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Content flags</h2>
        <p className="text-sm text-muted-foreground">
          Recorded every time the content filter rejected user input. Resolve
          entries you&apos;ve reviewed, or delete them to clear the log.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No flagged content yet.
        </p>
      ) : (
        <div className="rounded-md border">
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
        </div>
      )}
    </div>
  );
}
