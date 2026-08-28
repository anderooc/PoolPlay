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

import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  downloadTournamentPacketPdf,
  fetchTournamentPacket,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { shareDownloadedPdf } from "~/lib/share-pdf";
import { useThemeColors } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function PacketScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentPacket(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load the tournament packet."
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!slug) {
    return (
      <ErrorScreen
        title="Tournament unavailable"
        message="Missing tournament link."
        onRetry={() => {}}
      />
    );
  }
  if (data === null && error === null) return <LoadingScreen />;
  if (!data) {
    return (
      <ErrorScreen
        title="Packet unavailable"
        message={error ?? "Could not load the tournament packet."}
        onRetry={() => void refresh()}
      />
    );
  }

  async function onDownload() {
    setBusy(true);
    setActionError(null);
    try {
      await shareDownloadedPdf(
        () => downloadTournamentPacketPdf(slug!),
        `${slug}-packet.pdf`
      );
    } catch (cause) {
      setActionError(messageFor(cause, "Could not download the packet."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.title, { color: colors.foreground }]}>Packet</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          The tournament packet includes rules, schedule, and day-of logistics.
        </Text>

        {data.notes ? (
          <View style={[styles.card, { borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Logistics notes
            </Text>
            <Text style={[styles.notes, { color: colors.foreground }]}>
              {data.notes}
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            No logistics notes posted yet.
          </Text>
        )}

        {actionError ? (
          <Text style={{ color: colors.destructive }}>{actionError}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void onDownload()}
          style={[
            styles.button,
            { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={[styles.buttonLabel, { color: colors.primaryForeground }]}
            >
              Download PDF
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  notes: { fontSize: 15, lineHeight: 22 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonLabel: { fontSize: 16, fontWeight: "700" },
});
