import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Group, Flag, Calendar, UserCog } from "lucide-react";
import { db } from "@/lib/db";
import {
  users,
  tournaments,
  teams,
  contentFlags,
  registrations,
} from "@/lib/db/schema";
import { isNull, sql } from "drizzle-orm";
import { todayISO } from "@/lib/tournament-status";

export async function AdminOverviewPanel() {
  const today = todayISO();

  // One round-trip avoids parallel queries on a single pooler connection
  // (e.g. Supabase transaction mode), which can fail intermittently.
  const [counts] = await db.execute<{
    user_total: number;
    admin_total: number;
    tournament_total: number;
    active_tournaments: number;
    team_total: number;
    registration_total: number;
    open_flags: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM users) AS user_total,
      (SELECT count(*)::int FROM users WHERE role = 'admin') AS admin_total,
      (SELECT count(*)::int FROM tournaments) AS tournament_total,
      (SELECT count(*)::int FROM tournaments
        WHERE status IN ('in_progress', 'registration_open')
           OR date >= ${today}::date) AS active_tournaments,
      (SELECT count(*)::int FROM teams) AS team_total,
      (SELECT count(*)::int FROM registrations) AS registration_total,
      (SELECT count(*)::int FROM content_flags WHERE resolved_at IS NULL) AS open_flags
  `);

  const userTotal = { value: counts.user_total };
  const adminTotal = { value: counts.admin_total };
  const tournamentTotal = { value: counts.tournament_total };
  const activeTournaments = { value: counts.active_tournaments };
  const teamTotal = { value: counts.team_total };
  const registrationTotal = { value: counts.registration_total };
  const openFlags = { value: counts.open_flags };

  const stats: Array<{
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    hint?: string;
  }> = [
    {
      label: "Users",
      value: userTotal.value,
      icon: Users,
      hint: `${adminTotal.value} admin${adminTotal.value === 1 ? "" : "s"}`,
    },
    {
      label: "Tournaments",
      value: tournamentTotal.value,
      icon: Trophy,
      hint: `${activeTournaments.value} active`,
    },
    { label: "Teams", value: teamTotal.value, icon: Group },
    {
      label: "Registrations",
      value: registrationTotal.value,
      icon: Calendar,
    },
    {
      label: "Open content flags",
      value: openFlags.value,
      icon: Flag,
      hint: openFlags.value === 0 ? "All clear" : undefined,
    },
  ];

  const [recentUsers, recentFlags] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(5),
    db
      .select({
        id: contentFlags.id,
        area: contentFlags.area,
        text: contentFlags.text,
        blockedWord: contentFlags.blockedWord,
        createdAt: contentFlags.createdAt,
      })
      .from(contentFlags)
      .where(isNull(contentFlags.resolvedAt))
      .orderBy(sql`${contentFlags.createdAt} DESC`)
      .limit(5),
  ]);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} size="sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="text-2xl font-bold tabular-nums tracking-tight">
                  {s.value}
                </div>
                {s.hint && (
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              <span className="inline-flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Newest users
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentUsers.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-xs capitalize">
                      {u.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              <span className="inline-flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Open content flags
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentFlags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No flagged content right now.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentFlags.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-md border p-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                        {f.blockedWord}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {f.area}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-foreground">
                      {f.text}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
