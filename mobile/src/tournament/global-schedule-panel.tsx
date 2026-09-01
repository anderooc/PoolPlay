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

import type { GlobalScheduleMatchContract } from "@/lib/api/contracts/global-schedule";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatMatchTime,
  GENDER_LABELS,
  MATCH_STATUS_LABELS,
  REGION_LABELS,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";

export function GlobalSchedulePanel({
  matches,
}: {
  matches: GlobalScheduleMatchContract[];
}) {
  const colors = useThemeColors();
  const router = useRouter();

  if (matches.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        No scheduled matches yet. Games with a start time will appear here.
      </Text>
    );
  }

  let lastDay: string | null = null;

  return (
    <View style={styles.list}>
      {matches.map((match) => {
        const day = match.scheduledTime.slice(0, 10);
        const showDay = day !== lastDay;
        lastDay = day;

        return (
          <View key={match.id} style={styles.group}>
            {showDay ? (
              <Text style={[styles.day, { color: colors.mutedForeground }]}>
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            ) : null}
            <Pressable
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
              <Text style={[styles.tournament, { color: colors.primary }]}>
                {match.tournamentName}
              </Text>
              <Text style={[styles.teams, { color: colors.foreground }]}>
                {match.teamAName} vs {match.teamBName}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {match.contextLabel}
                {match.courtName ? ` · ${match.courtName}` : ""}
                {match.refTeamName ? ` · Ref ${match.refTeamName}` : ""}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {GENDER_LABELS[match.gender] ?? match.gender}
                {" · "}
                {REGION_LABELS[match.region] ?? match.region}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  group: { gap: 8 },
  day: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
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
  tournament: { fontSize: 13, fontWeight: "700" },
  teams: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 13, lineHeight: 18 },
  empty: { fontSize: 14, lineHeight: 20 },
});
