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

import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  VOLLEYBALL_POSITIONS,
  VOLLEYBALL_POSITION_LABELS,
} from "~/lib/format";
import { type ThemeColors, withAlpha } from "~/theme/colors";

export function VolleyballPositionChips({
  value,
  onChange,
  disabled = false,
  colors,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.chips}>
      <Pressable
        disabled={disabled}
        onPress={() => onChange(null)}
        style={chipStyle(value === null, colors)}
      >
        <Text style={chipTextStyle(value === null, colors)}>Not set</Text>
      </Pressable>
      {VOLLEYBALL_POSITIONS.map((position) => {
        const selected = value === position;
        return (
          <Pressable
            key={position}
            disabled={disabled}
            onPress={() => onChange(position)}
            style={chipStyle(selected, colors)}
          >
            <Text style={chipTextStyle(selected, colors)}>
              {VOLLEYBALL_POSITION_LABELS[position]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function chipStyle(selected: boolean, colors: ThemeColors) {
  return [
    styles.chip,
    {
      borderColor: selected ? colors.primary : colors.border,
      backgroundColor: selected
        ? withAlpha(colors.primary, 0.1)
        : "transparent",
      opacity: 1,
    },
  ];
}

function chipTextStyle(selected: boolean, colors: ThemeColors) {
  return {
    color: selected ? colors.primary : colors.mutedForeground,
    fontWeight: "700" as const,
    fontSize: 12,
  };
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
});
