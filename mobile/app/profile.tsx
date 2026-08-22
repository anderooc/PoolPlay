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
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiClientError } from "~/api/client";
import { fetchViewer } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { useThemeColors } from "~/theme/colors";

/**
 * Reads the profile from the API rather than from the Supabase session, which
 * is the point: it proves the bearer token is accepted by the brackt API and
 * that role and profile data come from the application database, not the JWT.
 */
export default function ProfileScreen() {
  const colors = useThemeColors();
  const { session, isLoading, signOut } = useSession();

  const [viewer, setViewer] = useState<ViewerContract | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    const controller = new AbortController();
    fetchViewer(controller.signal)
      .then(setViewer)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof ApiClientError
            ? cause.message
            : "Could not load your profile."
        );
      });

    return () => controller.abort();
  }, [session]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {viewer ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.name, { color: colors.foreground }]}>
            {viewer.fullName}
          </Text>
          <Text style={{ color: colors.mutedForeground }}>{viewer.email}</Text>

          <View style={styles.rows}>
            <Row label="Role" value={viewer.role} colors={colors} />
            <Row
              label="School"
              value={viewer.displaySchool ?? viewer.university ?? "—"}
              colors={colors}
            />
            <Row
              label="Position"
              value={viewer.volleyballPosition ?? "—"}
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
        onPress={() => void signOut()}
        style={[styles.signOut, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.destructive, fontWeight: "600" }}>
          Sign out
        </Text>
      </Pressable>
    </View>
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
      <Text style={{ color: colors.foreground, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  name: { fontSize: 22, fontWeight: "700" },
  rows: { marginTop: 12, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  signOut: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
