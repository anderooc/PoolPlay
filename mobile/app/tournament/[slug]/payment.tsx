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
  confirmTournamentPayment,
  fetchTournamentPayment,
  submitTournamentPayment,
  waiveTournamentPayment,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  formatFeeCents,
  PAYMENT_METHODS,
  paymentMethodLabel,
  paymentStatusLabel,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function PaymentScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [method, setMethod] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentPayment(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load payment details."
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (data === null && error === null) return <LoadingScreen />;
  if (!data || !slug) {
    return (
      <ErrorScreen
        title="Payment unavailable"
        message={error ?? "Could not load payment details."}
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
        <Text style={[styles.title, { color: colors.foreground }]}>Payment</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          brackt tracks payment status — it does not process card charges.
        </Text>

        {data.settings.instructionsText ? (
          <View style={[styles.card, { borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              How to pay
            </Text>
            <Text style={[styles.notes, { color: colors.foreground }]}>
              {data.settings.instructionsText}
            </Text>
          </View>
        ) : null}

        {actionError ? (
          <Text style={{ color: colors.destructive }}>{actionError}</Text>
        ) : null}

        {data.teams.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            No payment rows yet for your registered teams.
          </Text>
        ) : (
          data.teams.map((team) => {
            const settled =
              team.status === "confirmed" || team.status === "waived";
            const canSubmit = team.isCaptain && team.status === "unpaid";
            const selected = method[team.teamSlug] ?? "venmo";

            return (
              <View
                key={team.teamSlug}
                style={[styles.card, { borderColor: colors.border }]}
              >
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {team.teamName}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                  {formatFeeCents(team.amountCents)} ·{" "}
                  {paymentStatusLabel(team.status)}
                  {team.submittedMethod
                    ? ` · ${paymentMethodLabel(team.submittedMethod)}`
                    : ""}
                </Text>
                {team.submittedNote ? (
                  <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                    Captain note: {team.submittedNote}
                  </Text>
                ) : null}

                {canSubmit ? (
                  <View style={styles.submit}>
                    <Text
                      style={[styles.ackLabel, { color: colors.foreground }]}
                    >
                      Payment method
                    </Text>
                    <View style={styles.methods}>
                      {PAYMENT_METHODS.map((value) => {
                        const pressed = selected === value;
                        return (
                          <Pressable
                            key={value}
                            accessibilityRole="button"
                            accessibilityState={{ selected: pressed }}
                            onPress={() =>
                              setMethod((prev) => ({
                                ...prev,
                                [team.teamSlug]: value,
                              }))
                            }
                            style={[
                              styles.methodChip,
                              {
                                borderColor: pressed
                                  ? colors.primary
                                  : colors.border,
                                backgroundColor: pressed
                                  ? withAlpha(colors.primary, 0.1)
                                  : "transparent",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: pressed
                                  ? colors.primary
                                  : colors.mutedForeground,
                                fontWeight: "600",
                                fontSize: 13,
                              }}
                            >
                              {paymentMethodLabel(value)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      value={note[team.teamSlug] ?? ""}
                      onChangeText={(value) =>
                        setNote((prev) => ({
                          ...prev,
                          [team.teamSlug]: value,
                        }))
                      }
                      placeholder="Optional note"
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
                      disabled={busyKey === `submit-${team.teamSlug}`}
                      onPress={() =>
                        void run(`submit-${team.teamSlug}`, async () => {
                          await submitTournamentPayment(slug, {
                            teamSlug: team.teamSlug,
                            method: selected,
                            note: note[team.teamSlug],
                          });
                        })
                      }
                      style={[
                        styles.button,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      {busyKey === `submit-${team.teamSlug}` ? (
                        <ActivityIndicator color={colors.primaryForeground} />
                      ) : (
                        <Text
                          style={{
                            color: colors.primaryForeground,
                            fontWeight: "700",
                          }}
                        >
                          Mark payment sent
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}

                {data.isOrganizer && !settled ? (
                  <View style={styles.hostActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyKey === `confirm-${team.teamSlug}`}
                      onPress={() =>
                        void run(`confirm-${team.teamSlug}`, async () => {
                          await confirmTournamentPayment(slug, team.teamSlug);
                        })
                      }
                      style={[styles.outline, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.secondary, fontWeight: "700" }}>
                        Confirm
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyKey === `waive-${team.teamSlug}`}
                      onPress={() =>
                        void run(`waive-${team.teamSlug}`, async () => {
                          await waiveTournamentPayment(slug, team.teamSlug);
                        })
                      }
                      style={[styles.outline, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.mutedForeground, fontWeight: "700" }}>
                        Waive
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
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
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  notes: { fontSize: 15, lineHeight: 22 },
  submit: { gap: 8 },
  ackLabel: { fontSize: 14, fontWeight: "600" },
  methods: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  methodChip: {
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
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  hostActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  outline: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
