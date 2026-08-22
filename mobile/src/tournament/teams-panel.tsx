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
import { useThemeColors } from "~/theme/colors";

export function TournamentTeamsPanel({
  teams,
}: {
  teams: TournamentTeamContract[];
}) {
  const colors = useThemeColors();

  if (teams.length === 0) {
    return (
      <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
        No teams are confirmed yet. Check back as registration fills in.
      </Text>
    );
  }

  const groups = groupByDivision(teams);

  return (
    <View style={styles.stack}>
      {groups.map((group) => (
        <View key={group.name} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>
            {group.name}
          </Text>
          {group.teams.map((team) => (
            <View key={team.slug} style={styles.row}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {team.name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                {team.schoolName ?? team.university}
              </Text>
            </View>
          ))}
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
  stack: { gap: 20 },
  group: { gap: 2 },
  groupTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  row: { paddingVertical: 10, gap: 2 },
  name: { fontSize: 16, fontWeight: "600" },
});
