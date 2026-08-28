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

import type {
  PublicMatchStatus,
  TournamentMatchContract,
} from "@/lib/api/contracts/tournament";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchTournamentMatches } from "~/api/endpoints";
import { usePolling } from "~/lib/use-polling";
import { MatchRow } from "~/tournament/match-row";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { usePublicLoader } from "~/tournament/use-public-loader";
import { useThemeColors } from "~/theme/colors";

type BoardTab = PublicMatchStatus;

const TABS: { id: BoardTab; label: string }[] = [
  { id: "in_progress", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Final" },
];

export default function ScoringScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [tab, setTab] = useState<BoardTab>("in_progress");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) throw new Error("Tournament not found.");
      return (await fetchTournamentMatches(slug, signal)).matches;
    },
    [slug]
  );

  const { data, error, isRefreshing, reload, refresh, poll } = usePublicLoader(
    load,
    "Could not load scores."
  );

  usePolling(poll, 8000, data !== null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Live scores" });
  }, [navigation]);

  if (data === null && error === null) return <LoadingScreen />;
  if (!data) {
    return (
      <ErrorScreen
        title="Scores unavailable"
        message={error ?? "Could not load scores."}
        onRetry={() => void reload()}
      />
    );
  }

  const grouped: Record<BoardTab, TournamentMatchContract[]> = {
    in_progress: data.filter((match) => match.status === "in_progress"),
    upcoming: data.filter((match) => match.status === "upcoming"),
    completed: data.filter((match) => match.status === "completed"),
  };
  const visible = grouped[tab];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[styles.tabs, { borderBottomColor: colors.border }]}
        accessibilityRole="tablist"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          const count = grouped[item.id].length;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(item.id)}
              style={[
                styles.tab,
                selected ? { borderBottomColor: colors.primary } : null,
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.primary : colors.mutedForeground,
                  fontWeight: selected ? "700" : "600",
                  fontSize: 15,
                }}
              >
                {item.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {visible.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 15, lineHeight: 22 }}>
            {emptyCopy(tab, data.length === 0)}
          </Text>
        ) : (
          <View style={styles.list}>
            {visible.map((match) => (
              <MatchRow
                key={match.slug}
                match={match}
                onPress={() =>
                  router.push(`/tournament/${slug}/matches/${match.slug}`)
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function emptyCopy(tab: BoardTab, nonePosted: boolean): string {
  if (nonePosted) {
    return "No public matches yet. Scores appear here once the host releases pools or brackets.";
  }
  if (tab === "in_progress") {
    return "No matches on court right now. Check Upcoming, or pull to refresh.";
  }
  if (tab === "upcoming") {
    return "Nothing left on the upcoming board.";
  }
  return "No completed matches yet. Finals land here as sets close.";
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  content: { padding: 20, paddingBottom: 40 },
  list: { gap: 10 },
});
