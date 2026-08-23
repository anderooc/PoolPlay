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

import { useEffect, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { formatRailDate } from "~/lib/format";
import { useThemeColors } from "~/theme/colors";

const DATE_RAIL_ITEM_HEIGHT = 64;
const DATE_RAIL_WIDTH = 88;

export function DateRail({
  dates,
  selectedDate,
  today,
  onSelect,
}: {
  dates: string[];
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const colors = useThemeColors();
  const listRef = useRef<FlatList<string>>(null);
  const selectedIndex = dates.indexOf(selectedDate);

  useEffect(() => {
    if (selectedIndex < 0) return;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        viewPosition: 0.4,
        animated: true,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedIndex]);

  return (
    <View
      style={[styles.rail, { backgroundColor: colors.muted }]}
      accessibilityRole="scrollbar"
      accessibilityLabel="Date selector"
    >
      <FlatList
        ref={listRef}
        data={dates}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: DATE_RAIL_ITEM_HEIGHT,
          offset: DATE_RAIL_ITEM_HEIGHT * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index,
              viewPosition: 0.4,
              animated: false,
            });
          }, 80);
        }}
        contentContainerStyle={styles.railContent}
        renderItem={({ item }) => {
          const isSelected = item === selectedDate;
          const isToday = item === today;
          const { weekday, monthDay } = formatRailDate(item);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={
                isToday ? `Today, ${monthDay}` : `${weekday}, ${monthDay}`
              }
              onPress={() => onSelect(item)}
              style={[
                styles.item,
                isSelected && { backgroundColor: colors.card },
              ]}
            >
              {isToday ? (
                <Text
                  style={[
                    styles.today,
                    { color: isSelected ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  Today
                </Text>
              ) : (
                <Text
                  style={[
                    styles.weekday,
                    {
                      color: isSelected
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {weekday}
                </Text>
              )}
              <Text
                style={[
                  styles.monthDay,
                  {
                    color: isSelected ? colors.foreground : colors.mutedForeground,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {monthDay}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: DATE_RAIL_WIDTH,
    alignSelf: "stretch",
  },
  railContent: { paddingVertical: 8 },
  item: {
    height: DATE_RAIL_ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  today: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  weekday: { fontSize: 12, fontWeight: "600" },
  monthDay: { fontSize: 13, marginTop: 2 },
});
