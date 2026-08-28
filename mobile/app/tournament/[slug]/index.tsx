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
  TournamentDetailContract,
  TournamentMatchContract,
  TournamentTeamContract,
} from "@/lib/api/contracts/tournament";
import type { TournamentParticipationContract } from "@/lib/api/contracts/tournament-ops";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiClientError } from "~/api/client";
import {
  fetchTournament,
  fetchTournamentMatches,
  fetchTournamentParticipation,
  fetchTournamentTeams,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { TournamentMatchesPanel } from "~/tournament/matches-panel";
import { TournamentOverview } from "~/tournament/overview";
import { TournamentTeamsPanel } from "~/tournament/teams-panel";
import { useThemeColors } from "~/theme/colors";

type TabId = "overview" | "teams" | "matches";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "teams", label: "Teams" },
  { id: "matches", label: "Matches" },
];

export default function TournamentDetailScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug, tab: tabParam } = useLocalSearchParams<{
    slug: string;
    tab?: string;
  }>();

  const initialTab: TabId =
    tabParam === "teams" || tabParam === "matches" ? tabParam : "overview";
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    if (tabParam === "teams" || tabParam === "matches" || tabParam === "overview") {
      setTab(tabParam);
    }
  }, [tabParam]);
  const [tournament, setTournament] = useState<TournamentDetailContract | null>(
    null
  );
  const [participation, setParticipation] =
    useState<TournamentParticipationContract | null>(null);
  const [teams, setTeams] = useState<TournamentTeamContract[] | null>(null);
  const [matches, setMatches] = useState<TournamentMatchContract[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOverview = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) {
        setError("Tournament not found.");
        return;
      }
      // Wait for auth so Team tools can load with the rest of the overview.
      if (sessionLoading) return;
      try {
        setError(null);
        if (!session) {
          setTournament(await fetchTournament(slug, signal));
          setParticipation(null);
          return;
        }
        const [detail, part] = await Promise.all([
          fetchTournament(slug, signal),
          fetchTournamentParticipation(slug, signal).catch(() => null),
        ]);
        if (signal?.aborted) return;
        setTournament(detail);
        setParticipation(part);
      } catch (cause) {
        if (signal?.aborted) return;
        setTournament(null);
        setParticipation(null);
        setError(messageFor(cause, "Could not load this tournament."));
      }
    },
    [session, sessionLoading, slug]
  );

  const loadTeams = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) return;
      try {
        setTeams((await fetchTournamentTeams(slug, signal)).teams);
      } catch (cause) {
        if (signal?.aborted) return;
        setError(messageFor(cause, "Could not load teams."));
      }
    },
    [slug]
  );

  const loadMatches = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) return;
      try {
        setMatches((await fetchTournamentMatches(slug, signal)).matches);
      } catch (cause) {
        if (signal?.aborted) return;
        setError(messageFor(cause, "Could not load matches."));
      }
    },
    [slug]
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void loadOverview(controller.signal);
      return () => controller.abort();
    }, [loadOverview])
  );

  useEffect(() => {
    if (tab !== "teams" || teams !== null) return;
    const controller = new AbortController();
    void loadTeams(controller.signal);
    return () => controller.abort();
  }, [tab, teams, loadTeams]);

  useEffect(() => {
    if (tab !== "matches" || matches !== null) return;
    const controller = new AbortController();
    void loadMatches(controller.signal);
    return () => controller.abort();
  }, [tab, matches, loadMatches]);

  useLayoutEffect(() => {
    const canGoBack = navigation.canGoBack();
    navigation.setOptions({
      title: tournament?.name ?? "Tournament",
      headerBackTitle: "Tournaments",
      animationTypeForReplace: "pop",
      // Native back only appears when the stack has history. Deep links / cold
      // starts land here as the root screen, so provide an explicit fallback.
      headerLeft: canGoBack
        ? undefined
        : () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Tournaments"
              hitSlop={10}
              onPress={() => router.replace("/")}
              style={styles.headerBack}
            >
              <Text style={[styles.headerBackChevron, { color: colors.primary }]}>
                ‹
              </Text>
              <Text style={[styles.headerBackLabel, { color: colors.primary }]}>
                Tournaments
              </Text>
            </Pressable>
          ),
    });
  }, [colors.primary, navigation, router, tournament?.name]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setTeams(null);
    setMatches(null);
    await loadOverview();
    if (tab === "teams") await loadTeams();
    if (tab === "matches") await loadMatches();
    setIsRefreshing(false);
  }, [loadOverview, loadTeams, loadMatches, tab]);

  if ((tournament === null && error === null) || sessionLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Tournament unavailable
        </Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          {error}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadOverview()}
          style={[styles.retry, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[styles.tabs, { borderBottomColor: colors.border }]}
        accessibilityRole="tablist"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                setTab(item.id);
                router.setParams({ tab: item.id });
              }}
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
                {item.label}
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
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {error && tab !== "overview" ? (
          <Text style={{ color: colors.destructive }}>{error}</Text>
        ) : null}

        {tab === "overview" ? (
          <TournamentOverview
            tournament={tournament}
            participation={participation}
          />
        ) : null}

        {tab === "teams" ? (
          teams === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <TournamentTeamsPanel teams={teams} />
          )
        ) : null}

        {tab === "matches" ? (
          matches === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <TournamentMatchesPanel
              matches={matches}
              tournamentSlug={tournament.slug}
            />
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

function messageFor(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError && cause.code === "not_found") {
    return "This tournament is not posted, or the link is out of date.";
  }
  if (cause instanceof ApiClientError) return cause.message;
  return fallback;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -4,
    gap: 2,
  },
  headerBackChevron: {
    fontSize: 28,
    fontWeight: "400",
    lineHeight: 28,
    marginTop: -2,
  },
  headerBackLabel: { fontSize: 17, fontWeight: "400" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyBody: { fontSize: 15, textAlign: "center" },
  retry: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
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
});
