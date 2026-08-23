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

import type { TournamentListItemContract } from "@/lib/api/contracts/tournament";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  GENDER_LABELS,
  REGION_LABELS,
  registrationAvailabilityLabel,
  tournamentListStatusLabel,
} from "~/lib/format";
import { useThemeColors } from "~/theme/colors";

export function ScheduleRow({
  tournament,
  today,
  onPress,
}: {
  tournament: TournamentListItemContract;
  today: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const status = tournamentListStatusLabel(
    tournament.status,
    tournament.date,
    today
  );
  const gender = GENDER_LABELS[tournament.gender] ?? tournament.gender;
  const region = REGION_LABELS[tournament.region] ?? tournament.region;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tournament.name}, ${status}, ${tournament.location}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.muted : "transparent",
        },
      ]}
    >
      <View style={styles.top}>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {tournament.name}
        </Text>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>
          {status}
        </Text>
      </View>
      <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
        {tournament.location}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {registrationAvailabilityLabel(tournament.registrationAvailability)}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {gender} · {region}
      </Text>
      {tournament.hostSchool ? (
        <Text style={[styles.host, { color: colors.secondary }]} numberOfLines={1}>
          Hosted by {tournament.hostSchool.name}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 4,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  name: { flex: 1, fontSize: 16, fontWeight: "600", lineHeight: 20 },
  status: { fontSize: 13, fontWeight: "600", maxWidth: "42%", textAlign: "right" },
  meta: { fontSize: 13, lineHeight: 18 },
  host: { fontSize: 13, fontWeight: "600", marginTop: 2 },
});
