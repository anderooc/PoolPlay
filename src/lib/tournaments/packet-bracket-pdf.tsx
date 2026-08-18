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

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PacketBracketStructure } from "@/lib/tournaments/packet-bracket-tree";

const INK = "#1E293B";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const SURFACE_ALT = "#F1F5F9";

const MATCH_UNIT = 42;

const S = StyleSheet.create({
  bracketBlock: {
    marginBottom: 18,
  },
  bracketTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 8,
  },
  diagramRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  roundColumn: {
    width: 118,
    marginRight: 8,
  },
  roundLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: "center",
  },
  matchBox: {
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
    minHeight: 34,
    justifyContent: "center",
  },
  matchBoxAlt: {
    backgroundColor: SURFACE_ALT,
  },
  teamLine: {
    fontSize: 8,
    color: INK,
    lineHeight: 1.35,
  },
  teamLineMuted: {
    fontSize: 8,
    color: MUTED,
    fontStyle: "italic",
    lineHeight: 1.35,
  },
  vsLine: {
    fontSize: 6.5,
    color: MUTED,
    marginVertical: 1,
  },
});

function roundMatchSpacing(roundIndex: number): number {
  return MATCH_UNIT * 2 ** roundIndex;
}

export function BracketStructureSection({
  brackets,
  accent,
}: {
  brackets: PacketBracketStructure[];
  accent: string;
}) {
  if (brackets.length === 0) return null;

  return (
    <View>
      {brackets.map((bracket) => (
        <View key={bracket.name} style={S.bracketBlock}>
          <Text style={[S.bracketTitle, { color: accent }]}>{bracket.name}</Text>
          <View style={S.diagramRow}>
            {bracket.rounds.map((round, roundIndex) => (
              <View key={round.roundNumber} style={S.roundColumn}>
                <Text style={S.roundLabel}>{round.label}</Text>
                {round.matches.map((match, matchIndex) => (
                  <View
                    key={`${round.roundNumber}-${match.position}`}
                    style={{
                      marginBottom: 6,
                      marginTop:
                        matchIndex === 0
                          ? roundMatchSpacing(roundIndex) / 4
                          : roundMatchSpacing(roundIndex),
                    }}
                  >
                    <View
                      style={[
                        S.matchBox,
                        matchIndex % 2 === 1 ? S.matchBoxAlt : {},
                        { borderLeftWidth: 2, borderLeftColor: accent },
                      ]}
                    >
                      <Text style={S.teamLine}>{match.teamAName}</Text>
                      {!match.isBye ? (
                        <>
                          <Text style={S.vsLine}>vs</Text>
                          <Text style={S.teamLine}>{match.teamBName}</Text>
                        </>
                      ) : (
                        <Text style={S.teamLineMuted}>BYE</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
