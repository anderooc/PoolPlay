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

import type { SchoolListItemContract } from "@/lib/api/contracts/school";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiClientError } from "~/api/client";
import { fetchSchools } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  GENDER_LABELS,
  REGION_LABELS,
  SCHOOL_VERIFICATION_LABELS,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";

export default function SchoolsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const [schools, setSchools] = useState<SchoolListItemContract[]>([]);
  const [mySchool, setMySchool] = useState<{
    slug: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(handle);
  }, [query]);

  const hasSearch = debouncedQuery.length > 0;

  const loadMine = useCallback(async (signal?: AbortSignal) => {
    const page = await fetchSchools({ limit: 1 }, signal);
    setMySchool(page.mySchool);
    setError(null);
  }, []);

  const loadSearch = useCallback(
    async (signal?: AbortSignal) => {
      if (!debouncedQuery) {
        setSchools([]);
        return;
      }
      setIsSearching(true);
      try {
        const page = await fetchSchools(
          { q: debouncedQuery, limit: 50 },
          signal
        );
        setSchools(page.schools);
        setMySchool(page.mySchool);
        setError(null);
      } finally {
        if (!signal?.aborted) setIsSearching(false);
      }
    },
    [debouncedQuery]
  );

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void loadMine(controller.signal)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof ApiClientError
            ? cause.message
            : "Could not load schools."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    return () => controller.abort();
  }, [session, loadMine]);

  useEffect(() => {
    if (!session || !ready) return;
    if (!hasSearch) {
      setSchools([]);
      setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    void loadSearch(controller.signal).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setSchools([]);
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Could not load schools."
      );
    });
    return () => controller.abort();
  }, [session, ready, hasSearch, loadSearch]);

  const sorted = useMemo(() => {
    return [...schools].sort((a, b) => {
      if (a.matchesViewerEmail !== b.matchesViewerEmail) {
        return a.matchesViewerEmail ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [schools]);

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!ready && error === null) return <LoadingScreen />;
  if (!ready && error) {
    return (
      <ErrorScreen
        title="Couldn’t load schools"
        message={error}
        onRetry={() => void loadMine()}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search schools…"
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search schools"
          style={[
            styles.search,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        />
        {mySchool ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/schools/${mySchool.slug}`)}
            style={[
              styles.mine,
              {
                borderColor: colors.primary,
                backgroundColor: withAlpha(colors.primary, 0.1),
              },
            ]}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              Your school · {mySchool.name}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={hasSearch ? sorted : []}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              try {
                await loadMine();
                if (hasSearch) await loadSearch();
              } finally {
                setIsRefreshing(false);
              }
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            {isSearching
              ? "Searching…"
              : hasSearch
                ? "No schools match that search."
                : "Search by school or university name to browse programs."}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/schools/${item.slug}`)}
            style={[styles.row, { borderColor: colors.border }]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {item.name}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {item.university}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {GENDER_LABELS[item.gender] ?? item.gender}
                {" · "}
                {REGION_LABELS[item.region] ?? item.region}
                {" · "}
                {item.teamCount} team{item.teamCount === 1 ? "" : "s"}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {SCHOOL_VERIFICATION_LABELS[item.verificationStatus] ??
                  item.verificationStatus}
                {item.matchesViewerEmail ? " · Matches your email" : ""}
              </Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  mine: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  empty: { paddingTop: 40, textAlign: "center", fontSize: 15, lineHeight: 22 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: "700" },
  meta: { fontSize: 13, lineHeight: 18 },
});
