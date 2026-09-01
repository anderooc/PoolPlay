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

import type { ViewerContract } from "@/lib/api/contracts/viewer";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_BASE_URL } from "~/api/config";
import { ApiClientError } from "~/api/client";
import { fetchViewer } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  USER_PLAYER_GENDER_LABELS,
  VOLLEYBALL_POSITION_LABELS,
} from "~/lib/format";
import { useThemeColors } from "~/theme/colors";

export default function ProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading, signOut } = useSession();
  const [viewer, setViewer] = useState<ViewerContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      setViewer(await fetchViewer(signal));
    } catch (cause) {
      if (signal?.aborted) return;
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Could not load your profile."
      );
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [session, load]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
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
    >
      {viewer ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {viewer.avatarUrl ? (
            <Image
              source={{ uri: viewer.avatarUrl }}
              style={styles.avatar}
              accessibilityLabel="Profile photo"
            />
          ) : null}
          <Text style={[styles.name, { color: colors.foreground }]}>
            {viewer.fullName}
          </Text>
          <Text style={{ color: colors.mutedForeground }}>
            {viewer.displayEmail ?? viewer.email}
          </Text>

          <View style={styles.rows}>
            <Row label="Role" value={viewer.role} colors={colors} />
            <Row
              label="School"
              value={viewer.displaySchool ?? viewer.university ?? "—"}
              colors={colors}
            />
            <Row
              label="Gender"
              value={
                viewer.playerGender
                  ? (USER_PLAYER_GENDER_LABELS[viewer.playerGender] ??
                    viewer.playerGender)
                  : "—"
              }
              colors={colors}
            />
            <Row
              label="Position"
              value={
                viewer.volleyballPosition
                  ? (VOLLEYBALL_POSITION_LABELS[viewer.volleyballPosition] ??
                    viewer.volleyballPosition)
                  : "—"
              }
              colors={colors}
            />
            <Row
              label="Jersey"
              value={viewer.jerseyNumber?.toString() ?? "—"}
              colors={colors}
            />
          </View>
        </View>
      ) : error ? (
        <Text style={{ color: colors.destructive }}>{error}</Text>
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/notifications")}
        style={[styles.action, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>
          Notifications
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/profile/edit")}
        style={[styles.action, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>
          Edit profile
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/profile/password")}
        style={[styles.action, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>
          Change password
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => void Linking.openURL(`${API_BASE_URL}/privacy`)}
        style={[styles.action, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>
          Privacy notice
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => void Linking.openURL(`${API_BASE_URL}/terms`)}
        style={[styles.action, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>
          Terms of use
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/profile/delete-account")}
        style={[styles.action, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.destructive, fontWeight: "700" }}>
          Delete account
        </Text>
      </Pressable>

      <Pressable
        onPress={() => void signOut()}
        style={[styles.action, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.destructive, fontWeight: "600" }}>
          Sign out
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.mutedForeground }}>{label}</Text>
      <Text
        style={{
          color: colors.foreground,
          fontWeight: "600",
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
  },
  name: { fontSize: 22, fontWeight: "700" },
  rows: { marginTop: 12, gap: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  action: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
