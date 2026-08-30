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

import type { PersonalScheduleMatchContract } from "@/lib/api/contracts/personal-schedule";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatCalendarDate,
  formatMatchTime,
  MATCH_STATUS_LABELS,
  PERSONAL_SCHEDULE_ROLE_LABELS,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";

export function PersonalSchedulePanel({
  matches,
  compact,
}: {
  matches: PersonalScheduleMatchContract[];
  compact?: boolean;
}) {
  const colors = useThemeColors();
  const router = useRouter();

  if (matches.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        No upcoming matches. Scheduled games for your teams will show up here.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {matches.map((match) => (
        <Pressable
          key={match.id}
          accessibilityRole="button"
          onPress={() =>
            router.push(
              `/tournament/${match.tournamentSlug}/matches/${match.matchSlug}`
            )
          }
          style={[
            styles.row,
            {
              borderColor:
                match.status === "in_progress"
                  ? colors.primary
                  : colors.border,
              backgroundColor:
                match.status === "in_progress"
                  ? withAlpha(colors.primary, 0.05)
                  : colors.card,
            },
          ]}
        >
          <View style={styles.top}>
            <Text style={[styles.time, { color: colors.foreground }]}>
              {formatMatchTime(match.scheduledTime)}
            </Text>
            <Text style={[styles.status, { color: colors.mutedForeground }]}>
              {MATCH_STATUS_LABELS[match.status] ?? match.status}
            </Text>
          </View>

          {!compact ? (
            <Text style={[styles.tournament, { color: colors.mutedForeground }]}>
              {match.tournamentName} · {formatCalendarDate(match.tournamentDate)}
            </Text>
          ) : null}

          <Text style={[styles.matchup, { color: colors.foreground }]}>
            {match.teamAName} vs {match.teamBName}
          </Text>

          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {[match.courtName, match.contextLabel].filter(Boolean).join(" · ")}
          </Text>

          <View style={styles.roleRow}>
            <View
              style={[
                styles.roleChip,
                { backgroundColor: withAlpha(colors.primary, 0.1) },
              ]}
            >
              <Text style={[styles.roleText, { color: colors.primary }]}>
                {PERSONAL_SCHEDULE_ROLE_LABELS[match.role] ?? match.role}
              </Text>
            </View>
            {match.myTeamName ? (
              <Text style={[styles.teamName, { color: colors.mutedForeground }]}>
                {match.myTeamName}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  empty: { fontSize: 14, lineHeight: 20 },
  row: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  time: { fontSize: 15, fontWeight: "700" },
  status: { fontSize: 12, fontWeight: "600" },
  tournament: { fontSize: 13 },
  matchup: { fontSize: 16, fontWeight: "600", marginTop: 2 },
  meta: { fontSize: 13 },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  roleChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  teamName: { fontSize: 13 },
});
