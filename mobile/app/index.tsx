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
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiClientError } from "~/api/client";
import { fetchTournaments } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  formatCalendarDate,
  TOURNAMENT_STATUS_LABELS,
} from "~/lib/format";
import { useThemeColors, type ThemeColors } from "~/theme/colors";

function TournamentCard({
  tournament,
  colors,
}: {
  tournament: TournamentListItemContract;
  colors: ThemeColors;
}) {
  const { registrationAvailability: availability } = tournament;
  const spotsLeft =
    availability.capacity === null
      ? null
      : Math.max(0, availability.capacity - availability.registeredCount);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardDate, { color: colors.primary }]}>
          {formatCalendarDate(tournament.date)}
        </Text>
        <Text style={[styles.cardStatus, { color: colors.mutedForeground }]}>
          {TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status}
        </Text>
      </View>

      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
        {tournament.name}
      </Text>
      <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
        {tournament.location}
      </Text>

      {tournament.hostSchool ? (
        <Text style={[styles.cardMeta, { color: colors.secondary }]}>
          Hosted by {tournament.hostSchool.name}
        </Text>
      ) : null}

      <Text style={[styles.cardFooter, { color: colors.mutedForeground }]}>
        {availability.registeredCount} registered
        {spotsLeft !== null ? ` · ${spotsLeft} spots left` : ""}
        {availability.waitlistCount > 0
          ? ` · ${availability.waitlistCount} waitlisted`
          : ""}
      </Text>
    </View>
  );
}

export default function TournamentsScreen() {
  const colors = useThemeColors();
  const { session } = useSession();

  const [tournaments, setTournaments] = useState<
    TournamentListItemContract[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const page = await fetchTournaments({ limit: 50 }, signal);
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

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  if (tournaments === null && error === null) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={tournaments ?? []}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              onPress={() =>
                router.push(session ? "/profile" : "/sign-in")
              }
              style={[styles.authButton, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                {session ? "Profile" : "Sign in"}
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${formatCalendarDate(item.date)}`}
            onPress={() => router.push(`/tournament/${item.slug}`)}
          >
            <TournamentCard tournament={item} colors={colors} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: colors.mutedForeground }}>
              {error ?? "No tournaments posted yet."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  listContent: { padding: 16, gap: 12 },
  header: { alignItems: "flex-end", paddingBottom: 4 },
  authButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardDate: { fontSize: 13, fontWeight: "700" },
  cardStatus: { fontSize: 13 },
  cardTitle: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  cardMeta: { fontSize: 14 },
  cardFooter: { fontSize: 13, marginTop: 6 },
});
