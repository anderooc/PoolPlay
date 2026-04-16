import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin } from "lucide-react";
import Link from "next/link";

export default async function TournamentsPage() {
  const allTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.startDate));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground">
            Browse and manage volleyball tournaments.
          </p>
        </div>
        <Link href="/tournaments/new" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
        </Link>
      </div>

      {allTournaments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              No tournaments yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allTournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    <Badge
                      variant={
                        t.status === "in_progress"
                          ? "default"
                          : t.status === "registration_open"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {t.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {t.location}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t.startDate}
                    {t.startDate !== t.endDate && ` \u2013 ${t.endDate}`}
                  </p>
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {t.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
