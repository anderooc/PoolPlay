"use client";

/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState } from "react";
import { Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table as DataTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CROSS_POOL_SEEDING_RULES,
  formatTiebreakCriteriaList,
  type BracketSeedingReport,
} from "@/lib/tournaments/combined-bracket-standings";

export function BracketSeedingTable({
  report,
  showTiers,
}: {
  report: BracketSeedingReport;
  /** When false, bracket tier columns are hidden (pool play still in progress). */
  showTiers: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (report.rows.length === 0) return null;

  const multiplePools = new Set(report.rows.map((r) => r.poolName)).size > 1;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="bracket-seeding-breakdown"
        >
          <Table className="h-4 w-4" aria-hidden />
          {open ? "Hide seeding breakdown" : "Seeding breakdown"}
        </Button>
      </div>

      <Card
        id="bracket-seeding-breakdown"
        className={cn(!open && "hidden")}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            How bracket seeding was decided
          </CardTitle>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground/80">Pool ties:</span>{" "}
              {formatTiebreakCriteriaList(report.tiebreakCriteria)}
            </p>
            {multiplePools && <p>{CROSS_POOL_SEEDING_RULES}</p>}
            {!report.allPoolsComplete && (
              <p className="text-warning">
                Pool play is still in progress — standings and tiers update as
                matches finish.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead className="text-center" title="Finish within pool">
                  Pool
                </TableHead>
                <TableHead className="text-center" title="Original pool seed">
                  Seed
                </TableHead>
                <TableHead className="text-center">W-L</TableHead>
                <TableHead className="text-center">Sets</TableHead>
                <TableHead className="text-center">+/-</TableHead>
                {showTiers && (
                  <>
                    <TableHead>Bracket</TableHead>
                    <TableHead
                      className="text-center"
                      title="Seed within bracket"
                    >
                      Br. seed
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.teamId}>
                  <TableCell className="font-medium tabular-nums">
                    {row.overallRank}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{row.teamName}</span>
                    {row.university && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({row.university})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.poolName}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {ordinal(row.poolPlace)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.poolSeed ?? "—"}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.wins}-{row.losses}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.setsWon}-{row.setsLost}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                  </TableCell>
                  {showTiers && (
                    <>
                      <TableCell>{row.bracketTier ?? "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        {row.bracketSeed ?? "—"}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
