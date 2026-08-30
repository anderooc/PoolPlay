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

import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
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
  fetchTournamentRegisterOptions,
  submitTournamentRegistration,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { formatDeadline } from "~/lib/format";
import { goBackOrReplace } from "~/lib/navigation";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function RegisterScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    acceptedCount: number;
    waitlistedCount: number;
  } | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentRegisterOptions(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load registration."
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
        title="Registration unavailable"
        message={error ?? "Could not load registration."}
        onRetry={() => void refresh()}
      />
    );
  }

  function toggle(teamSlug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamSlug)) next.delete(teamSlug);
      else next.add(teamSlug);
      return next;
    });
  }

  async function onSubmit() {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const outcome = await submitTournamentRegistration(slug!, {
        teamSlugs: [...selected],
        operationId: Crypto.randomUUID(),
      });
      setResult(outcome);
      await refresh();
      setSelected(new Set());
    } catch (cause) {
      setActionError(messageFor(cause, "Could not register teams."));
    } finally {
      setBusy(false);
    }
  }

  const spotsLeft =
    data.availability.capacity === null
      ? null
      : Math.max(
          0,
          data.availability.capacity - data.availability.registeredCount
        );

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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Register
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Select captain teams to enter this {data.genderLabel.toLowerCase()}{" "}
          tournament.
        </Text>

        <View style={[styles.facts, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            {data.availability.registeredCount} registered
            {spotsLeft !== null ? ` · ${spotsLeft} spots left` : ""}
            {data.availability.waitlistCount > 0
              ? ` · ${data.availability.waitlistCount} waitlisted`
              : ""}
          </Text>
          {data.availability.deadline ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              Deadline {formatDeadline(data.availability.deadline)}
            </Text>
          ) : null}
        </View>

        {result ? (
          <View
            style={[
              styles.result,
              { backgroundColor: withAlpha(colors.primary, 0.12) },
            ]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Registration submitted
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              {result.acceptedCount > 0
                ? `${result.acceptedCount} team${result.acceptedCount === 1 ? "" : "s"} accepted.`
                : null}
              {result.waitlistedCount > 0
                ? ` ${result.waitlistedCount} waitlisted.`
                : null}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                goBackOrReplace(router, `/tournament/${slug}`)
              }
              style={[styles.done, { borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Done
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!data.registrationOpen ? (
          <Text style={{ color: colors.destructive, fontSize: 15 }}>
            {data.closedReason ?? "Registration is closed."}
          </Text>
        ) : null}

        {data.myTeams.length > 0 ? (
          <View style={styles.block}>
            <Text style={[styles.section, { color: colors.foreground }]}>
              Already entered
            </Text>
            {data.myTeams.map((team) => (
              <Text
                key={team.slug}
                style={{ color: colors.mutedForeground, fontSize: 15 }}
              >
                {team.name} · {team.status}
              </Text>
            ))}
          </View>
        ) : null}

        {data.emptyMessage ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            {data.emptyMessage}
          </Text>
        ) : null}

        {data.eligibleTeams.length > 0 ? (
          <View style={styles.block}>
            <Text style={[styles.section, { color: colors.foreground }]}>
              Your teams
            </Text>
            {data.eligibleTeams.map((team) => {
              const pressed = selected.has(team.slug);
              return (
                <Pressable
                  key={team.slug}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: pressed }}
                  onPress={() => toggle(team.slug)}
                  style={[
                    styles.teamRow,
                    {
                      borderColor: pressed ? colors.primary : colors.border,
                      backgroundColor: pressed
                        ? withAlpha(colors.primary, 0.1)
                        : "transparent",
                    },
                  ]}
                >
                  <View style={styles.teamText}>
                    <Text
                      style={[styles.teamName, { color: colors.foreground }]}
                    >
                      {team.name}
                    </Text>
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 13 }}
                    >
                      {team.university}
                    </Text>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {pressed ? "Selected" : "Select"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {actionError ? (
          <Text style={{ color: colors.destructive }}>{actionError}</Text>
        ) : null}
      </ScrollView>

      {data.registrationOpen && data.eligibleTeams.length > 0 && !result ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            disabled={busy || selected.size === 0}
            onPress={() => void onSubmit()}
            style={[
              styles.submit,
              {
                backgroundColor: colors.primary,
                opacity: busy || selected.size === 0 ? 0.5 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[
                  styles.submitLabel,
                  { color: colors.primaryForeground },
                ]}
              >
                {selected.size <= 1
                  ? "Register team"
                  : `Register ${selected.size} teams`}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22 },
  facts: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  block: { gap: 10 },
  section: { fontSize: 17, fontWeight: "700" },
  teamRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamText: { flex: 1, gap: 2 },
  teamName: { fontSize: 16, fontWeight: "700" },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  submit: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitLabel: { fontSize: 16, fontWeight: "700" },
  result: { borderRadius: 12, padding: 14, gap: 8 },
  done: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
});
