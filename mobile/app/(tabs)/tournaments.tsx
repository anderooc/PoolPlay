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
import type { TeamGender, TeamRegion } from "@/types";
import { router, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiClientError } from "~/api/client";
import { fetchTournaments } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  formatScheduleHeading,
  parseISODate,
  todayISO,
} from "~/lib/format";
import { useThemeColors, withAlpha, type ThemeColors } from "~/theme/colors";
import { DateRail } from "~/tournament/date-rail";
import {
  buildScheduleGroups,
  countActiveTournamentFilters,
  emptyScheduleCopy,
  filterTournamentList,
  toggleSetValue,
} from "~/tournament/filter-tournament-list";
import { ListFiltersSheet } from "~/tournament/list-filters";
import { MonthCalendar } from "~/tournament/month-calendar";
import { ScheduleRow } from "~/tournament/schedule-row";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";

const LIST_LIMIT = 100;

export default function TournamentsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const { session } = useSession();

  const [tournaments, setTournaments] = useState<
    TournamentListItemContract[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<Set<TeamGender>>(
    () => new Set()
  );
  const [regionFilter, setRegionFilter] = useState<Set<TeamRegion>>(
    () => new Set()
  );
  const [hideArchived, setHideArchived] = useState(false);
  const [registrationOpenOnly, setRegistrationOpenOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => todayISO());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = parseISODate(todayISO());
    return { year: today.getFullYear(), monthIndex: today.getMonth() };
  });
  const [now, setNow] = useState(() => new Date().toISOString());
  const today = todayISO();

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const page = await fetchTournaments({ limit: LIST_LIMIT }, signal);
      setTournaments(page.tournaments);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Something went wrong loading tournaments."
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!registrationOpenOnly) return;
    const id = setInterval(() => setNow(new Date().toISOString()), 30_000);
    return () => clearInterval(id);
  }, [registrationOpenOnly]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setNow(new Date().toISOString());
    await load();
    setIsRefreshing(false);
  }, [load]);

  const activeCount = countActiveTournamentFilters({
    genderFilter,
    regionFilter,
    hideArchived,
    registrationOpenOnly,
  });
  const hasActiveFilters = activeCount > 0;

  const filtered = useMemo(() => {
    if (!tournaments) return [];
    return filterTournamentList(tournaments, {
      query,
      genderFilter,
      regionFilter,
      hideArchived,
      registrationOpenOnly,
      today,
      now,
    });
  }, [
    tournaments,
    query,
    genderFilter,
    regionFilter,
    hideArchived,
    registrationOpenOnly,
    today,
    now,
  ]);

  const groups = useMemo(
    () => buildScheduleGroups(filtered, { today, selectedDate }),
    [filtered, today, selectedDate]
  );
  const selectedGroup =
    groups.find((group) => group.date === selectedDate) ?? {
      date: selectedDate,
      tournaments: [] as TournamentListItemContract[],
    };
  const markedDates = useMemo(
    () => new Set(filtered.map((tournament) => tournament.date)),
    [filtered]
  );

  const clearFilters = useCallback(() => {
    setGenderFilter(new Set());
    setRegionFilter(new Set());
    setHideArchived(false);
    setRegistrationOpenOnly(false);
  }, []);

  function handleCalendarSelect(iso: string) {
    setSelectedDate(iso);
    setCalendarOpen(false);
  }

  function openCalendar() {
    const next = parseISODate(selectedDate);
    setCalendarMonth({ year: next.getFullYear(), monthIndex: next.getMonth() });
    setCalendarOpen((open) => !open);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: session
        ? undefined
        : () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              onPress={() => router.push("/sign-in")}
              hitSlop={8}
              style={{ paddingHorizontal: 4, paddingVertical: 6 }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                Sign in
              </Text>
            </Pressable>
          ),
    });
  }, [colors.primary, navigation, session]);

  if (tournaments === null && error === null) {
    return <LoadingScreen />;
  }

  if (tournaments === null && error) {
    return (
      <ErrorScreen
        title="Couldn’t load tournaments"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  const empty =
    filtered.length === 0
      ? emptyScheduleCopy({
          loadedCount: tournaments?.length ?? 0,
          query,
          hasActiveFilters,
        })
      : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tournaments…"
            placeholderTextColor={colors.mutedForeground}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search tournaments"
            style={[
              styles.search,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          />
          <FilterButton
            activeCount={activeCount}
            colors={colors}
            onPress={() => setFiltersOpen(true)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Calendar, ${formatScheduleHeading(selectedDate)} selected`}
            onPress={openCalendar}
            style={[
              styles.toolButton,
              {
                borderColor: colors.border,
                backgroundColor:
                  calendarOpen || selectedDate !== today
                    ? colors.muted
                    : "transparent",
              },
            ]}
          >
            <Text style={[styles.toolButtonLabel, { color: colors.foreground }]}>
              Calendar
            </Text>
          </Pressable>
        </View>

        {calendarOpen ? (
          <MonthCalendar
            selectedDate={selectedDate}
            today={today}
            markedDates={markedDates}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelectDate={handleCalendarSelect}
          />
        ) : null}
      </View>

      {empty ? (
        <ScrollView
          contentContainerStyle={styles.empty}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {empty.title}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            {empty.body}
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.split}>
          <View style={styles.dayPane}>
            <View style={styles.dayHeading}>
              {selectedDate === today ? (
                <View
                  style={[
                    styles.todayChip,
                    { backgroundColor: withAlpha(colors.primary, 0.12) },
                  ]}
                >
                  <Text style={[styles.todayChipLabel, { color: colors.primary }]}>
                    Today
                  </Text>
                </View>
              ) : null}
              <Text
                style={[styles.dayTitle, { color: colors.foreground }]}
                accessibilityRole="header"
              >
                {formatScheduleHeading(selectedDate)}
              </Text>
            </View>
            <FlatList
              data={selectedGroup.tournaments}
              keyExtractor={(item) => item.slug}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.dayList}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              renderItem={({ item }) => (
                <ScheduleRow
                  tournament={item}
                  today={today}
                  onPress={() => router.push(`/tournament/${item.slug}`)}
                />
              )}
              ListEmptyComponent={
                <View
                  style={[
                    styles.dayEmpty,
                    { borderColor: colors.border, backgroundColor: colors.muted },
                  ]}
                >
                  <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                    No tournaments scheduled.
                  </Text>
                </View>
              }
            />
          </View>
          <DateRail
            dates={groups.map((group) => group.date)}
            selectedDate={selectedDate}
            today={today}
            onSelect={setSelectedDate}
          />
        </View>
      )}

      <ListFiltersSheet
        visible={filtersOpen}
        genderFilter={genderFilter}
        regionFilter={regionFilter}
        hideArchived={hideArchived}
        registrationOpenOnly={registrationOpenOnly}
        activeCount={activeCount}
        onToggleGender={(value) =>
          setGenderFilter((prev) => toggleSetValue(prev, value))
        }
        onToggleRegion={(value) =>
          setRegionFilter((prev) => toggleSetValue(prev, value))
        }
        onHideArchivedChange={setHideArchived}
        onRegistrationOpenOnlyChange={(value) => {
          setRegistrationOpenOnly(value);
          setNow(new Date().toISOString());
        }}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </View>
  );
}

function FilterButton({
  activeCount,
  colors,
  onPress,
}: {
  activeCount: number;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const hasActive = activeCount > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        hasActive ? `Filters, ${activeCount} active` : "Filter tournaments"
      }
      onPress={onPress}
      style={[
        styles.toolButton,
        {
          borderColor: colors.border,
          backgroundColor: hasActive ? colors.muted : "transparent",
        },
      ]}
    >
      <Text style={[styles.toolButtonLabel, { color: colors.foreground }]}>
        Filters
      </Text>
      {hasActive ? (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.badgeLabel, { color: colors.primaryForeground }]}>
            {activeCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 },
  toolbarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  search: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  toolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  toolButtonLabel: { fontSize: 14, fontWeight: "600" },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeLabel: { fontSize: 11, fontWeight: "700" },
  split: { flex: 1, flexDirection: "row" },
  dayPane: { flex: 1, minWidth: 0 },
  dayHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  todayChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todayChipLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dayTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  dayList: { paddingHorizontal: 16, paddingBottom: 24 },
  dayEmpty: {
    marginTop: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
  },
  empty: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyBody: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
