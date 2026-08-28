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

import type { TournamentTeamContract } from "@/lib/api/contracts/tournament";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors, withAlpha } from "~/theme/colors";

export function TournamentTeamsPanel({
  teams,
}: {
  teams: TournamentTeamContract[];
}) {
  const colors = useThemeColors();

  if (teams.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No teams yet
        </Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          Confirmed teams appear here as registration fills in.
        </Text>
      </View>
    );
  }

  const groups = groupByDivision(teams);

  return (
    <View style={styles.stack}>
      <Text style={[styles.summary, { color: colors.mutedForeground }]}>
        {teams.length} team{teams.length === 1 ? "" : "s"} confirmed
      </Text>
      {groups.map((group) => (
        <View key={group.name} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={[styles.groupTitle, { color: colors.foreground }]}>
              {group.name}
            </Text>
            <View
              style={[
                styles.countChip,
                { backgroundColor: withAlpha(colors.secondary, 0.12) },
              ]}
            >
              <Text style={[styles.countLabel, { color: colors.secondary }]}>
                {group.teams.length}
              </Text>
            </View>
          </View>
          <View
            style={[styles.list, { borderColor: colors.border }]}
          >
            {group.teams.map((team, index) => (
              <View
                key={team.slug}
                style={[
                  styles.row,
                  index > 0
                    ? {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                      }
                    : null,
                ]}
              >
                <Text
                  style={[styles.name, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {team.name}
                </Text>
                <Text
                  style={[styles.school, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {team.schoolName ?? team.university}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function groupByDivision(teams: TournamentTeamContract[]) {
  const groups: { name: string; teams: TournamentTeamContract[] }[] = [];
  const index = new Map<string, number>();

  for (const team of teams) {
    const name = team.divisionName ?? "Unassigned";
    const existing = index.get(name);
    if (existing === undefined) {
      index.set(name, groups.length);
      groups.push({ name, teams: [team] });
    } else {
      groups[existing].teams.push(team);
    }
  }

  return groups;
}

const styles = StyleSheet.create({
  stack: { gap: 22 },
  summary: { fontSize: 14, fontWeight: "600" },
  group: { gap: 10 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  groupTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  countChip: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countLabel: { fontSize: 12, fontWeight: "700" },
  list: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 3,
  },
  name: { fontSize: 16, fontWeight: "600", lineHeight: 21 },
  school: { fontSize: 14, lineHeight: 18 },
  empty: { gap: 8, paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 15, lineHeight: 22 },
});
