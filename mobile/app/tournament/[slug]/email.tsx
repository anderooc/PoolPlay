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
  TextInput,
  View,
} from "react-native";
import {
  fetchTournamentEmail,
  previewTournamentEmail,
  sendTournamentEmail,
  sendTournamentWaiverReminder,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { EMAIL_AUDIENCE_OPTIONS } from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function EmailScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [audience, setAudience] = useState<string>("captains_confirmed");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentEmail(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load email tools."
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (data === null && error === null) return <LoadingScreen />;
  if (!data || !slug) {
    return (
      <ErrorScreen
        title="Email unavailable"
        message={error ?? "Could not load email tools."}
        onRetry={() => void refresh()}
      />
    );
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setActionError(null);
    setActionSuccess(null);
    try {
      await action();
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Something went wrong."));
    } finally {
      setBusy(null);
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
        <Text style={[styles.title, { color: colors.foreground }]}>Email</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Send updates to registered team captains. Daily send limits apply.
        </Text>

        {!data.canSend && data.lockedReason ? (
          <Text style={{ color: colors.destructive, fontSize: 14 }}>
            {data.lockedReason}
          </Text>
        ) : null}

        <View style={styles.audiences}>
          {EMAIL_AUDIENCE_OPTIONS.map((option) => {
            const pressed = audience === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: pressed }}
                onPress={() => {
                  setAudience(option.value);
                  setPreview(null);
                }}
                style={[
                  styles.audience,
                  {
                    borderColor: pressed ? colors.primary : colors.border,
                    backgroundColor: pressed
                      ? withAlpha(colors.primary, 0.1)
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: pressed ? colors.primary : colors.mutedForeground,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Subject"
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
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message"
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
          style={[
            styles.textarea,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />

        {preview ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            {preview}
          </Text>
        ) : null}
        {actionError ? (
          <Text style={{ color: colors.destructive }}>{actionError}</Text>
        ) : null}
        {actionSuccess ? (
          <Text style={{ color: colors.secondary }}>{actionSuccess}</Text>
        ) : null}

        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            disabled={!data.canSend || busy !== null}
            onPress={() =>
              void run("preview", async () => {
                const result = await previewTournamentEmail(slug, audience);
                setPreview(
                  `${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"} · ${result.audienceLabel}`
                );
              })
            }
            style={[styles.outline, { borderColor: colors.border }]}
          >
            {busy === "preview" ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Preview
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!data.canSend || busy !== null}
            onPress={() =>
              void run("send", async () => {
                const result = await sendTournamentEmail(slug, {
                  audience,
                  subject,
                  body,
                });
                setActionSuccess(
                  `Sent to ${result.recipientCount} captain${result.recipientCount === 1 ? "" : "s"}.`
                );
                setSubject("");
                setBody("");
              })
            }
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: data.canSend ? 1 : 0.5,
              },
            ]}
          >
            {busy === "send" ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={{ color: colors.primaryForeground, fontWeight: "700" }}
              >
                Send email
              </Text>
            )}
          </Pressable>
        </View>

        {data.waiverEnabled ? (
          <Pressable
            accessibilityRole="button"
            disabled={!data.canSend || busy !== null}
            onPress={() =>
              void run("waiver", async () => {
                const result = await sendTournamentWaiverReminder(slug);
                setActionSuccess(
                  `Waiver reminder sent to ${result.recipientCount} captain${result.recipientCount === 1 ? "" : "s"}.`
                );
              })
            }
            style={[styles.outline, { borderColor: colors.border }]}
          >
            {busy === "waiver" ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ color: colors.secondary, fontWeight: "700" }}>
                Send waiver reminder
              </Text>
            )}
          </Pressable>
        ) : null}

        <View style={styles.history}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Recent sends
          </Text>
          {data.history.length === 0 ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              No emails sent yet.
            </Text>
          ) : (
            data.history.map((row) => (
              <View
                key={row.id}
                style={[styles.historyRow, { borderColor: colors.border }]}
              >
                <Text
                  style={{ color: colors.foreground, fontWeight: "600" }}
                  numberOfLines={1}
                >
                  {row.subject}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  {row.recipientCount} recipients ·{" "}
                  {new Date(row.sentAt).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22 },
  audiences: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  audience: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 140,
  },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  outline: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  history: { gap: 10, marginTop: 8 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  historyRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    gap: 3,
  },
});
