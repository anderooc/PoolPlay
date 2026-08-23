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

import type { TeamGender, TeamRegion } from "@/types";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  GENDER_LABELS,
  REGION_LABELS,
  TEAM_GENDER_VALUES,
  TEAM_REGION_VALUES,
} from "~/lib/format";
import { useThemeColors, withAlpha, type ThemeColors } from "~/theme/colors";

export function ListFiltersSheet({
  visible,
  genderFilter,
  regionFilter,
  hideArchived,
  registrationOpenOnly,
  activeCount,
  onToggleGender,
  onToggleRegion,
  onHideArchivedChange,
  onRegistrationOpenOnlyChange,
  onClear,
  onClose,
}: {
  visible: boolean;
  genderFilter: ReadonlySet<TeamGender>;
  regionFilter: ReadonlySet<TeamRegion>;
  hideArchived: boolean;
  registrationOpenOnly: boolean;
  activeCount: number;
  onToggleGender: (value: TeamGender) => void;
  onToggleRegion: (value: TeamRegion) => void;
  onHideArchivedChange: (value: boolean) => void;
  onRegistrationOpenOnlyChange: (value: boolean) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const hasActive = activeCount > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.sheet, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            accessibilityRole="header"
          >
            Filters
          </Text>
          <View style={styles.headerActions}>
            {hasActive ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                onPress={onClear}
                hitSlop={8}
              >
                <Text style={[styles.headerLink, { color: colors.mutedForeground }]}>
                  Clear all
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={onClose}
              hitSlop={8}
            >
              <Text style={[styles.headerLink, { color: colors.primary, fontWeight: "700" }]}>
                Done
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.switchCard,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <SwitchRow
              label="Hide past events"
              description="Only show today and upcoming dates"
              value={hideArchived}
              onValueChange={onHideArchivedChange}
              colors={colors}
            />
            <View style={[styles.switchRule, { backgroundColor: colors.border }]} />
            <SwitchRow
              label="Registration open"
              description="Only tournaments accepting sign-ups"
              value={registrationOpenOnly}
              onValueChange={onRegistrationOpenOnlyChange}
              colors={colors}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Gender
          </Text>
          <View style={styles.chipGrid}>
            {TEAM_GENDER_VALUES.map((value) => (
              <FilterChip
                key={value}
                label={GENDER_LABELS[value]}
                pressed={genderFilter.has(value)}
                onPress={() => onToggleGender(value)}
                tone={value === "mens" ? "primary" : "secondary"}
                colors={colors}
              />
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Region
          </Text>
          <View style={styles.chipGrid}>
            {TEAM_REGION_VALUES.map((value) => (
              <FilterChip
                key={value}
                label={REGION_LABELS[value]}
                pressed={regionFilter.has(value)}
                onPress={() => onToggleRegion(value)}
                tone="neutral"
                colors={colors}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  colors,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchCopy}>
        <Text style={[styles.switchLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text style={[styles.switchDescription, { color: colors.mutedForeground }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.card}
      />
    </View>
  );
}

function FilterChip({
  label,
  pressed,
  onPress,
  tone,
  colors,
}: {
  label: string;
  pressed: boolean;
  onPress: () => void;
  tone: "primary" | "secondary" | "neutral";
  colors: ThemeColors;
}) {
  const accent =
    tone === "secondary"
      ? colors.secondary
      : tone === "primary"
        ? colors.primary
        : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: pressed }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: pressed ? accent : colors.border,
          backgroundColor: pressed ? withAlpha(accent, 0.12) : "transparent",
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: pressed ? accent : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerLink: { fontSize: 16, fontWeight: "600" },
  body: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  switchCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  switchCopy: { flex: 1, gap: 3 },
  switchLabel: { fontSize: 15, fontWeight: "600" },
  switchDescription: { fontSize: 13, lineHeight: 18 },
  switchRule: { height: StyleSheet.hairlineWidth },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    width: "48%",
    flexGrow: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
});
