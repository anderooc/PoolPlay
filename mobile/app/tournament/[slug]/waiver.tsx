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
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  acknowledgeTournamentWaiver,
  downloadTournamentWaiverPdf,
  fetchTournamentWaiver,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { waiverMethodLabel } from "~/lib/format";
import { shareDownloadedPdf } from "~/lib/share-pdf";
import { useThemeColors } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function WaiverScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [signedName, setSignedName] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentWaiver(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load waiver details."
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (data === null && error === null) return <LoadingScreen />;
  if (!data || !slug) {
    return (
      <ErrorScreen
        title="Waiver unavailable"
        message={error ?? "Could not load waiver details."}
        onRetry={() => void refresh()}
      />
    );
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Something went wrong."));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Waiver</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {data.hasPdf
            ? `Current waiver v${data.version}${data.fileName ? ` · ${data.fileName}` : ""}`
            : "No waiver PDF has been uploaded yet."}
        </Text>

        <View style={styles.actions}>
          {data.settings.allowDownloadPrint && data.hasPdf ? (
            <Pressable
              accessibilityRole="button"
              disabled={busyKey === "download"}
              onPress={() =>
                void run("download", async () => {
                  await shareDownloadedPdf(
                    () => downloadTournamentWaiverPdf(slug),
                    `${slug}-waiver.pdf`
                  );
                })
              }
              style={[styles.outline, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Download PDF
              </Text>
            </Pressable>
          ) : null}
          {data.settings.allowThirdParty && data.settings.thirdPartyUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                void Linking.openURL(data.settings.thirdPartyUrl!)
              }
              style={[styles.outline, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.secondary, fontWeight: "700" }}>
                Sign externally
              </Text>
            </Pressable>
          ) : null}
        </View>

        {actionError ? (
          <Text style={{ color: colors.destructive }}>{actionError}</Text>
        ) : null}

        {data.teams.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            No registered teams are available for waiver tracking yet.
          </Text>
        ) : (
          data.teams.map((team) => {
            const myRow = team.roster.find((member) => member.isViewer);
            const canAck =
              data.settings.allowDigitalAck && myRow && !myRow.completed;

            return (
              <View
                key={team.teamSlug}
                style={[styles.card, { borderColor: colors.border }]}
              >
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {team.teamName}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                  {team.completedCount}/{team.totalCount} complete
                  {team.complete ? " · Ready for check-in" : ""}
                </Text>

                {canAck ? (
                  <View style={styles.ack}>
                    <Text
                      style={[styles.ackLabel, { color: colors.foreground }]}
                    >
                      Your digital acknowledgment
                    </Text>
                    <TextInput
                      value={signedName[team.teamSlug] ?? ""}
                      onChangeText={(value) =>
                        setSignedName((prev) => ({
                          ...prev,
                          [team.teamSlug]: value,
                        }))
                      }
                      placeholder="Full legal name"
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.input,
                        {
                          color: colors.foreground,
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                        },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyKey === `ack-${team.teamSlug}`}
                      onPress={() =>
                        void run(`ack-${team.teamSlug}`, async () => {
                          await acknowledgeTournamentWaiver(slug, {
                            teamSlug: team.teamSlug,
                            signedName: signedName[team.teamSlug] ?? "",
                          });
                        })
                      }
                      style={[
                        styles.button,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      {busyKey === `ack-${team.teamSlug}` ? (
                        <ActivityIndicator color={colors.primaryForeground} />
                      ) : (
                        <Text
                          style={{
                            color: colors.primaryForeground,
                            fontWeight: "700",
                          }}
                        >
                          I agree
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.roster}>
                  {team.roster.map((member) => (
                    <View key={member.userId} style={styles.rosterRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontWeight: "600",
                            fontSize: 15,
                          }}
                        >
                          {member.fullName}
                          {member.role === "captain" ? " · Captain" : ""}
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 13,
                          }}
                        >
                          {member.completed
                            ? waiverMethodLabel(member.method)
                            : "Pending"}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: member.completed
                            ? colors.secondary
                            : colors.mutedForeground,
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        {member.completed ? "Done" : "Open"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  outline: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  ack: { gap: 8 },
  ackLabel: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  roster: { gap: 0 },
  rosterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
});
