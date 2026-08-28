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

import type { TeamListItemContract } from "@/lib/api/contracts/team";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiClientError } from "~/api/client";
import { fetchTeams } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  GENDER_LABELS,
  REGION_LABELS,
  TEAM_ROLE_LABELS,
  TEAM_VERIFICATION_LABELS,
} from "~/lib/format";
import { useThemeColors } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";

export default function TeamsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const [teams, setTeams] = useState<TeamListItemContract[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const page = await fetchTeams(signal);
      setTeams(page.teams);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Could not load your teams."
      );
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [session, load]);

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (teams === null && error === null) return <LoadingScreen />;
  if (teams === null && error) {
    return (
      <ErrorScreen
        title="Couldn’t load teams"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={teams ?? []}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              await load();
              setIsRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No teams yet
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Create a team on the web to manage your roster and register for
              tournaments.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/teams/${item.slug}`)}
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
                {TEAM_ROLE_LABELS[item.role] ?? item.role}
                {" · "}
                {GENDER_LABELS[item.gender] ?? item.gender}
                {" · "}
                {REGION_LABELS[item.region] ?? item.region}
              </Text>
              {item.school ? (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {item.school.name}
                </Text>
              ) : item.verificationStatus !== "verified" ? (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {TEAM_VERIFICATION_LABELS[item.verificationStatus] ??
                    item.verificationStatus}
                </Text>
              ) : null}
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
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  empty: { paddingTop: 48, paddingHorizontal: 16, gap: 8 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
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
