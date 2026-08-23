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
import { formatMonthTitle, parseISODate } from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { monthCellIsos, shiftMonth } from "./filter-tournament-list";

const WEEKDAYS = [
  { key: "sun", short: "S", label: "Sunday" },
  { key: "mon", short: "M", label: "Monday" },
  { key: "tue", short: "T", label: "Tuesday" },
  { key: "wed", short: "W", label: "Wednesday" },
  { key: "thu", short: "T", label: "Thursday" },
  { key: "fri", short: "F", label: "Friday" },
  { key: "sat", short: "S", label: "Saturday" },
] as const;

export function MonthCalendar({
  selectedDate,
  today,
  markedDates,
  month,
  onMonthChange,
  onSelectDate,
}: {
  selectedDate: string;
  today: string;
  markedDates: ReadonlySet<string>;
  month: { year: number; monthIndex: number };
  onMonthChange: (next: { year: number; monthIndex: number }) => void;
  onSelectDate: (iso: string) => void;
}) {
  const colors = useThemeColors();
  const cells = monthCellIsos(month.year, month.monthIndex);

  return (
    <View
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
      accessibilityLabel={`Calendar, ${formatMonthTitle(month.year, month.monthIndex)}`}
    >
      <View style={styles.monthBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => onMonthChange(shiftMonth(month.year, month.monthIndex, -1))}
          hitSlop={8}
          style={styles.monthNav}
        >
          <Text style={[styles.monthNavLabel, { color: colors.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.foreground }]}>
          {formatMonthTitle(month.year, month.monthIndex)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => onMonthChange(shiftMonth(month.year, month.monthIndex, 1))}
          hitSlop={8}
          style={styles.monthNav}
        >
          <Text style={[styles.monthNavLabel, { color: colors.primary }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <Text
            key={day.key}
            accessibilityLabel={day.label}
            style={[styles.weekday, { color: colors.mutedForeground }]}
          >
            {day.short}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((iso, index) => {
          if (!iso) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          const hasEvents = markedDates.has(iso);
          const dayNumber = parseISODate(iso).getDate();
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${formatA11yDay(iso)}${hasEvents ? ", has tournaments" : ""}${isToday ? ", today" : ""}`}
              onPress={() => onSelectDate(iso)}
              style={styles.dayCell}
            >
              <View
                style={[
                  styles.dayHit,
                  isSelected && {
                    backgroundColor: colors.primary,
                  },
                  isToday && !isSelected && {
                    borderColor: colors.primary,
                    borderWidth: 1,
                    backgroundColor: withAlpha(colors.primary, 0.08),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: isSelected
                        ? colors.primaryForeground
                        : isToday
                          ? colors.primary
                          : colors.foreground,
                      fontWeight: isSelected || isToday ? "700" : "500",
                    },
                  ]}
                >
                  {dayNumber}
                </Text>
              </View>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: hasEvents
                      ? isSelected
                        ? colors.primaryForeground
                        : colors.primary
                      : "transparent",
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function formatA11yDay(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  monthTitle: { fontSize: 16, fontWeight: "700" },
  monthNav: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  monthNavLabel: { fontSize: 28, lineHeight: 32, fontWeight: "500" },
  weekRow: { flexDirection: "row" },
  weekday: {
    width: "14.285%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    paddingBottom: 6,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.285%",
    alignItems: "center",
    paddingVertical: 2,
    minHeight: 44,
  },
  dayHit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: { fontSize: 14 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
