/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import type {
  PlayDivisionContract,
  PlayPoolContract,
  TournamentPlayContract,
} from "@/lib/api/contracts/tournament";
import { PublicMatchRow } from "./public-match-row";

export function PublicPoolsView({
  play,
  tournamentSlug,
}: {
  play: TournamentPlayContract;
  tournamentSlug: string;
}) {
  const withPools = play.divisions.filter(
    (division) =>
      division.released &&
      (division.format === "pool_to_bracket" || division.pools.length > 0)
  );

  if (withPools.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Pool play has not been released yet, or this tournament goes straight to
        brackets.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {withPools.map((division) => (
        <DivisionPools
          key={division.name}
          division={division}
          tournamentSlug={tournamentSlug}
        />
      ))}
    </div>
  );
}

function DivisionPools({
  division,
  tournamentSlug,
}: {
  division: PlayDivisionContract;
  tournamentSlug: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">{division.name}</h2>
      {division.pools.map((pool) => (
        <PoolSection
          key={pool.name}
          pool={pool}
          tournamentSlug={tournamentSlug}
        />
      ))}
    </section>
  );
}

function PoolSection({
  pool,
  tournamentSlug,
}: {
  pool: PlayPoolContract;
  tournamentSlug: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/80 p-4">
      <h3 className="font-medium">{pool.name}</h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Team</th>
              <th className="pb-2 px-2 font-medium">W-L</th>
              <th className="pb-2 px-2 font-medium">Sets</th>
              <th className="pb-2 pl-2 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {pool.standings.map((row) => (
              <tr key={row.teamSlug} className="border-b border-border/50">
                <td className="py-2 pr-3 font-medium">{row.teamName}</td>
                <td className="px-2 tabular-nums text-muted-foreground">
                  {row.wins}-{row.losses}
                </td>
                <td className="px-2 tabular-nums text-muted-foreground">
                  {row.setsWon}-{row.setsLost}
                </td>
                <td className="pl-2 tabular-nums text-muted-foreground">
                  {row.pointDiff > 0 ? "+" : ""}
                  {row.pointDiff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pool.matches.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Matches
          </p>
          {pool.matches.map((match) => (
            <PublicMatchRow
              key={match.slug}
              match={match}
              tournamentSlug={tournamentSlug}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
