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

import { bracketDisplayName } from "@/lib/tournaments/bracket-tiers";
import { isBracketRoundOneByeMatch } from "@/lib/utils/bracket";

export type PacketBracketMatchCell = {
  position: number;
  teamAName: string;
  teamBName: string;
  isBye: boolean;
};

export type PacketBracketRound = {
  roundNumber: number;
  label: string;
  matches: PacketBracketMatchCell[];
};

export type PacketBracketStructure = {
  name: string;
  rounds: PacketBracketRound[];
};

function bracketRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinals";
  if (round === totalRounds - 2) return "Quarterfinals";
  return `Round ${round}`;
}

function teamLabel(
  teamId: string | null,
  teamNameById: Map<string, string>
): string {
  if (!teamId) return "TBD";
  return teamNameById.get(teamId) ?? "TBD";
}

export function buildPacketBracketStructures(input: {
  brackets: Array<{ id: string; name: string | null; tier: number }>;
  matches: Array<{
    bracketId: string | null;
    bracketRound: number | null;
    bracketPosition: number | null;
    teamAId: string | null;
    teamBId: string | null;
  }>;
  teamNameById: Map<string, string>;
}): PacketBracketStructure[] {
  const { brackets, matches, teamNameById } = input;

  const sortedBrackets = [...brackets].sort((a, b) => a.tier - b.tier);

  return sortedBrackets
    .map((bracket) => {
      const bracketMatches = matches.filter((m) => m.bracketId === bracket.id);
      if (bracketMatches.length === 0) return null;

      const roundMap = new Map<number, typeof bracketMatches>();
      for (const match of bracketMatches) {
        const round = match.bracketRound ?? 1;
        const bucket = roundMap.get(round) ?? [];
        bucket.push(match);
        roundMap.set(round, bucket);
      }

      const roundNumbers = [...roundMap.keys()].sort((a, b) => a - b);
      const totalRounds = roundNumbers.length;

      const rounds: PacketBracketRound[] = roundNumbers.map((roundNumber) => {
        const roundMatches = [...(roundMap.get(roundNumber) ?? [])].sort(
          (a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
        );

        return {
          roundNumber,
          label: bracketRoundLabel(roundNumber, totalRounds),
          matches: roundMatches.map((match) => {
            const isBye = isBracketRoundOneByeMatch({
              teamAId: match.teamAId,
              teamBId: match.teamBId,
              bracketRound: match.bracketRound,
            });

            return {
              position: match.bracketPosition ?? 0,
              teamAName: teamLabel(match.teamAId, teamNameById),
              teamBName: isBye
                ? "BYE"
                : teamLabel(match.teamBId, teamNameById),
              isBye,
            };
          }),
        };
      });

      return {
        name: `${bracketDisplayName(bracket)} Bracket`,
        rounds,
      };
    })
    .filter((row): row is PacketBracketStructure => row != null);
}
