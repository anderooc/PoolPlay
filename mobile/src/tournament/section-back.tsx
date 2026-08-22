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

import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useThemeColors } from "~/theme/colors";

export function SectionBack({
  label = "Tournament",
  fallbackHref,
}: {
  label?: string;
  fallbackHref?: Href;
}) {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
      hitSlop={10}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(fallbackHref ?? "/");
      }}
      style={styles.row}
    >
      <Text style={[styles.chevron, { color: colors.primary }]}>‹</Text>
      <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    marginBottom: 8,
  },
  chevron: { fontSize: 28, fontWeight: "400", lineHeight: 28, marginTop: -2 },
  label: { fontSize: 16, fontWeight: "600" },
});
