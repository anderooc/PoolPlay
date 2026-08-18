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

import { Page, Text, View, Svg, Line, StyleSheet } from "@react-pdf/renderer";
import type { PacketBracketStructure } from "@/lib/tournaments/packet-bracket-tree";

const INK = "#1E293B";
const MUTED = "#64748B";
const LINE_COLOR = "#94A3B8";
const BORDER = "#E2E8F0";

const PAGE_PADDING = 40;
const FOOTER_HEIGHT = 48;
const ROUND_LABEL_HEIGHT = 18;

/** Usable space on a letter page for the diagram. */
const MAX_DIAGRAM_HEIGHT = 640;
const MAX_DIAGRAM_WIDTH = 532;

const STROKE = 1;
const CONNECTOR = 16;
const TEAM_LINE = 20;

type BracketMetrics = {
  matchBlock: number;
  slotWidth: number;
  connector: number;
  matchWidth: number;
  bracketHeight: number;
  teamLine: number;
};

function computeBracketMetrics(
  firstRoundCount: number,
  roundCount: number
): BracketMetrics {
  const teamLine = TEAM_LINE;
  let slotWidth = 96;
  let connector = CONNECTOR;

  let matchBlock = Math.floor(
    (MAX_DIAGRAM_HEIGHT - ROUND_LABEL_HEIGHT) / Math.max(firstRoundCount, 1)
  );
  matchBlock = Math.min(48, Math.max(26, matchBlock));

  let bracketHeight = firstRoundCount * matchBlock;
  let matchWidth = slotWidth + connector * 2;
  let totalWidth = roundCount * matchWidth;

  if (totalWidth > MAX_DIAGRAM_WIDTH) {
    const scale = MAX_DIAGRAM_WIDTH / totalWidth;
    slotWidth = Math.max(72, Math.floor(slotWidth * scale));
    connector = Math.max(10, Math.floor(connector * scale));
    matchWidth = slotWidth + connector * 2;
    totalWidth = roundCount * matchWidth;
  }

  if (bracketHeight > MAX_DIAGRAM_HEIGHT - ROUND_LABEL_HEIGHT) {
    matchBlock = Math.floor(
      (MAX_DIAGRAM_HEIGHT - ROUND_LABEL_HEIGHT) / Math.max(firstRoundCount, 1)
    );
    matchBlock = Math.max(22, matchBlock);
    bracketHeight = firstRoundCount * matchBlock;
  }

  return {
    matchBlock,
    slotWidth,
    connector,
    matchWidth,
    bracketHeight,
    teamLine: Math.max(16, Math.min(teamLine, matchBlock * 0.35)),
  };
}

const S = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING,
    paddingBottom: FOOTER_HEIGHT,
    paddingHorizontal: PAGE_PADDING,
    fontFamily: "Helvetica",
    color: INK,
  },
  pageHeader: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tournamentName: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 3,
  },
  bracketTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  diagramWrap: {
    flex: 1,
    justifyContent: "center",
  },
  diagramRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  roundColumn: {
    flexDirection: "column",
  },
  roundLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
    height: ROUND_LABEL_HEIGHT,
    marginBottom: 4,
  },
  matchCell: {
    position: "relative",
  },
  teamSlot: {
    position: "absolute",
    left: 0,
    paddingLeft: 2,
    justifyContent: "flex-end",
  },
  teamName: {
    fontSize: 7.5,
    color: INK,
  },
  teamNameMuted: {
    fontSize: 7.5,
    color: MUTED,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    fontSize: 7,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

function BracketMatchCell({
  match,
  blockHeight,
  metrics,
  showAdvance,
  isLastRound,
}: {
  match: PacketBracketStructure["rounds"][number]["matches"][number];
  blockHeight: number;
  metrics: BracketMetrics;
  showAdvance: boolean;
  isLastRound: boolean;
}) {
  const { slotWidth, connector, matchWidth, teamLine } = metrics;
  const teamABottom = blockHeight * 0.25;
  const teamBBottom = blockHeight * 0.75;
  const midY = blockHeight * 0.5;
  const strokeColor = LINE_COLOR;
  const advanceWidth = isLastRound ? connector : connector * 2;

  if (match.isBye) {
    return (
      <View
        style={[
          S.matchCell,
          { height: blockHeight, width: matchWidth },
        ]}
      >
        <Svg
          width={matchWidth}
          height={blockHeight}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <Line
            x1={0}
            y1={midY}
            x2={slotWidth}
            y2={midY}
            stroke={strokeColor}
            strokeWidth={STROKE}
          />
          {showAdvance ? (
            <Line
              x1={slotWidth}
              y1={midY}
              x2={slotWidth + advanceWidth}
              y2={midY}
              stroke={strokeColor}
              strokeWidth={STROKE}
            />
          ) : null}
        </Svg>
        <View
          style={[
            S.teamSlot,
            {
              top: midY - teamLine,
              height: teamLine,
              width: slotWidth,
            },
          ]}
        >
          <Text style={S.teamName}>{match.teamAName}</Text>
        </View>
        <View
          style={[
            S.teamSlot,
            {
              top: midY,
              height: teamLine,
              width: slotWidth,
            },
          ]}
        >
          <Text style={S.teamNameMuted}>BYE</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[S.matchCell, { height: blockHeight, width: matchWidth }]}>
      <Svg
        width={matchWidth}
        height={blockHeight}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Line
          x1={0}
          y1={teamABottom}
          x2={slotWidth}
          y2={teamABottom}
          stroke={strokeColor}
          strokeWidth={STROKE}
        />
        <Line
          x1={0}
          y1={teamBBottom}
          x2={slotWidth}
          y2={teamBBottom}
          stroke={strokeColor}
          strokeWidth={STROKE}
        />
        <Line
          x1={slotWidth}
          y1={teamABottom}
          x2={slotWidth}
          y2={teamBBottom}
          stroke={strokeColor}
          strokeWidth={STROKE}
        />
        {showAdvance ? (
          <Line
            x1={slotWidth}
            y1={midY}
            x2={slotWidth + advanceWidth}
            y2={midY}
            stroke={strokeColor}
            strokeWidth={STROKE}
          />
        ) : null}
      </Svg>
      <View
        style={[
          S.teamSlot,
          {
            top: teamABottom - teamLine,
            height: teamLine,
            width: slotWidth,
          },
        ]}
      >
        <Text style={S.teamName}>{match.teamAName}</Text>
      </View>
      <View
        style={[
          S.teamSlot,
          {
            top: teamBBottom - teamLine,
            height: teamLine,
            width: slotWidth,
          },
        ]}
      >
        <Text style={S.teamName}>{match.teamBName}</Text>
      </View>
    </View>
  );
}

function BracketDiagram({ bracket }: { bracket: PacketBracketStructure }) {
  const firstRoundCount = bracket.rounds[0]?.matches.length ?? 1;
  const roundCount = bracket.rounds.length;
  const metrics = computeBracketMetrics(firstRoundCount, roundCount);
  const { matchBlock, matchWidth, bracketHeight } = metrics;

  return (
    <View style={S.diagramWrap}>
      <View style={S.diagramRow}>
        {bracket.rounds.map((round, roundIndex) => {
          const blockHeight = matchBlock * 2 ** roundIndex;
          const isLastRound = roundIndex === bracket.rounds.length - 1;

          return (
            <View
              key={round.roundNumber}
              style={[S.roundColumn, { width: matchWidth, height: bracketHeight + ROUND_LABEL_HEIGHT }]}
            >
              <Text style={S.roundLabel}>{round.label}</Text>
              {round.matches.map((match) => (
                <BracketMatchCell
                  key={`${round.roundNumber}-${match.position}`}
                  match={match}
                  blockHeight={blockHeight}
                  metrics={metrics}
                  showAdvance={!isLastRound}
                  isLastRound={isLastRound}
                />
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function BracketStructurePages({
  brackets,
  accent,
  tournamentName,
}: {
  brackets: PacketBracketStructure[];
  accent: string;
  tournamentName: string;
}) {
  if (brackets.length === 0) return null;

  return (
    <>
      {brackets.map((bracket) => (
        <Page key={bracket.name} size="LETTER" style={S.page} wrap={false}>
          <View style={[S.pageHeader, { borderBottomColor: accent }]}>
            <Text style={S.tournamentName}>{tournamentName}</Text>
            <Text style={[S.bracketTitle, { color: accent }]}>
              {bracket.name}
            </Text>
          </View>
          <BracketDiagram bracket={bracket} />
          <Text style={S.footer} fixed>
            Bracket structure · Teams shown reflect seeding at packet generation
          </Text>
        </Page>
      ))}
    </>
  );
}
