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

import type { TournamentMatchContract } from "@/lib/api/contracts/tournament";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatMatchTime,
  formatSetLine,
  MATCH_STATUS_LABELS,
} from "~/lib/format";
import { useThemeColors, withAlpha, type ThemeColors } from "~/theme/colors";

export function MatchRow({
  match,
  onPress,
  compact,
}: {
  match: TournamentMatchContract;
  onPress?: () => void;
  compact?: boolean;
}) {
  const colors = useThemeColors();
  const status = MATCH_STATUS_LABELS[match.status] ?? match.status;
  const setLine = formatSetLine(match.sets);
  const teamA = match.teamA?.name ?? "TBD";
  const teamB = match.teamB?.name ?? "TBD";
  const isLive = match.status === "in_progress";
  const meta = [
    match.scheduledTime ? formatMatchTime(match.scheduledTime) : null,
    match.courtName,
    compact ? null : match.phase === "bracket" ? "Bracket" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <View
      style={[
        styles.row,
        {
          borderColor: isLive ? colors.primary : colors.border,
          backgroundColor: isLive
            ? withAlpha(colors.primary, 0.05)
            : colors.card,
        },
      ]}
    >
      <View style={styles.top}>
        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: isLive
                ? withAlpha(colors.primary, 0.12)
                : colors.muted,
            },
          ]}
        >
          <Text
            style={[
              styles.status,
              { color: isLive ? colors.primary : colors.mutedForeground },
            ]}
          >
            {status}
          </Text>
        </View>
        {meta ? (
          <Text
            style={[styles.meta, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {meta}
          </Text>
        ) : null}
      </View>

      <TeamLine
        team={match.teamA}
        won={match.winnerSlug === match.teamA?.slug}
        colors={colors}
      />
      <TeamLine
        team={match.teamB}
        won={match.winnerSlug === match.teamB?.slug}
        colors={colors}
      />

      {setLine ? (
        <Text style={[styles.sets, { color: colors.mutedForeground }]}>
          {setLine}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${status}. ${teamA} versus ${teamB}`}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

function TeamLine({
  team,
  won,
  colors,
}: {
  team: TournamentMatchContract["teamA"];
  won: boolean;
  colors: ThemeColors;
}) {
  return (
    <Text
      style={[
        styles.team,
        {
          color: colors.foreground,
          fontWeight: won ? "700" : "500",
        },
      ]}
      numberOfLines={1}
    >
      {team?.name ?? "TBD"}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  status: { fontSize: 12, fontWeight: "700" },
  meta: { fontSize: 13, flexShrink: 1, textAlign: "right" },
  team: { fontSize: 16, lineHeight: 22 },
  sets: { fontSize: 13, marginTop: 6 },
});
