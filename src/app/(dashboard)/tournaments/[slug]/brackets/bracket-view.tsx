"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBracketTypeLabel } from "@/lib/labels/bracket";

interface BracketMatch {
  id: string;
  slug: string;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  bracketRound: number | null;
  bracketPosition: number | null;
  winnerId: string | null;
  status: string;
}

interface Bracket {
  id: string;
  bracketType: string;
  seedCount: number;
  matches: BracketMatch[];
}

export function BracketView({
  bracket,
  slug,
}: {
  bracket: Bracket;
  slug: string;
}) {
  const rounds = new Map<number, BracketMatch[]>();
  for (const match of bracket.matches) {
    const round = match.bracketRound ?? 1;
    if (!rounds.has(round)) rounds.set(round, []);
    rounds.get(round)!.push(match);
  }

  // Sort matches within each round by position
  for (const [, roundMatches] of rounds) {
    roundMatches.sort(
      (a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
    );
  }

  const sortedRounds = [...rounds.entries()].sort(([a], [b]) => a - b);
  const totalRounds = sortedRounds.length;

  function roundLabel(round: number): string {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semifinal";
    if (round === totalRounds - 2) return "Quarterfinal";
    return `Round ${round}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {formatBracketTypeLabel(bracket.bracketType)} ({bracket.seedCount}{" "}
          teams)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {sortedRounds.map(([round, roundMatches]) => (
            <div key={round} className="flex-shrink-0 space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground text-center">
                {roundLabel(round)}
              </h4>
              <div
                className="flex flex-col justify-around gap-4"
                style={{ minHeight: `${roundMatches.length * 80}px` }}
              >
                {roundMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/tournaments/${slug}/matches/${match.slug}`}
                    className="block w-48 overflow-hidden rounded border bg-card transition-colors hover:border-primary/50 hover:bg-muted/40"
                  >
                    <MatchupSlot
                      name={match.teamAName}
                      isWinner={match.winnerId === match.teamAId && !!match.winnerId}
                    />
                    <div className="border-t" />
                    <MatchupSlot
                      name={match.teamBName}
                      isWinner={match.winnerId === match.teamBId && !!match.winnerId}
                    />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchupSlot({
  name,
  isWinner,
}: {
  name: string | null;
  isWinner: boolean;
}) {
  return (
    <div
      className={cn(
        "px-3 py-2 text-sm",
        isWinner && "bg-primary/10 font-semibold",
        !name && "text-muted-foreground italic"
      )}
    >
      {name ?? "TBD"}
    </div>
  );
}
