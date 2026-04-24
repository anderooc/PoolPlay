"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BracketMatch {
  id: string;
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

export function BracketView({ bracket }: { bracket: Bracket }) {
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
          {bracket.bracketType.replace(/_/g, " ")} ({bracket.seedCount} teams)
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
                  <div
                    key={match.id}
                    className="w-48 rounded border bg-card overflow-hidden"
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
                  </div>
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
