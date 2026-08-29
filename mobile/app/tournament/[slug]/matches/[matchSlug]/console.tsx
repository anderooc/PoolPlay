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

import type { MatchConsoleContract } from "@/lib/api/contracts/match-console";
import { Redirect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  fetchMatchConsole,
  runMatchConsoleAction,
  runMatchCrewAction,
  saveMatchSetScore,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { usePolling } from "~/lib/use-polling";
import { useThemeColors } from "~/theme/colors";
import { MatchConsolePanel } from "~/tournament/match-console-panel";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function MatchConsoleScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug, matchSlug } = useLocalSearchParams<{
    slug: string;
    matchSlug: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [consoleData, setConsoleData] = useState<MatchConsoleContract | null>(
    null
  );

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!slug || !matchSlug) {
        return Promise.reject(new Error("Match not found."));
      }
      return fetchMatchConsole(slug, matchSlug, signal);
    },
    [slug, matchSlug]
  );

  const { data, error, isRefreshing, reload, refresh, poll } = usePublicLoader(
    load,
    "Could not load the match console."
  );

  useLayoutEffect(() => {
    const current = consoleData ?? data;
    navigation.setOptions({
      title: current ? matchTitle(current) : "Match console",
    });
  }, [consoleData, data, navigation]);

  useLayoutEffect(() => {
    if (data) setConsoleData(data);
  }, [data]);

  usePolling(
    poll,
    4000,
    (consoleData ?? data)?.derivedPhase === "in_progress"
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!slug || !matchSlug) {
    return (
      <ErrorScreen
        title="Match unavailable"
        message="Missing match link."
        onRetry={() => {}}
      />
    );
  }
  if (data === null && error === null) return <LoadingScreen />;

  const view = consoleData ?? data;
  if (!view) {
    return (
      <ErrorScreen
        title="Match unavailable"
        message={error ?? "Could not load the match console."}
        onRetry={() => void reload()}
      />
    );
  }

  async function applyConsole(next: MatchConsoleContract) {
    setConsoleData(next);
  }

  async function runAction(action: () => Promise<{ console: MatchConsoleContract }>) {
    setBusy(true);
    setActionError(null);
    try {
      const result = await action();
      await applyConsole(result.console);
    } catch (cause) {
      setActionError(messageFor(cause, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  function confirmFinalize(winnerSlug: string | null, label: string) {
    Alert.alert("Finalize match", `Record result: ${label}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Finalize",
        onPress: () =>
          void runAction(() =>
            runMatchConsoleAction(slug!, matchSlug!, "finalize", { winnerSlug })
          ),
      },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
    >
      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {actionError ? (
        <Text style={{ color: colors.destructive }}>{actionError}</Text>
      ) : null}
      <MatchConsolePanel
        data={view}
        colors={colors}
        busy={busy}
        onLifecycle={(action, winnerSlug) => {
          if (action === "finalize") {
            const label =
              winnerSlug === view.teamA?.slug
                ? view.teamA?.name ?? "Team A"
                : winnerSlug === view.teamB?.slug
                  ? view.teamB?.name ?? "Team B"
                  : "Tie";
            confirmFinalize(winnerSlug ?? null, label);
            return;
          }
          if (action === "reopen") {
            Alert.alert(
              "Reopen match",
              "Reopen this match for score corrections?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reopen",
                  onPress: () =>
                    void runAction(() =>
                      runMatchConsoleAction(slug!, matchSlug!, "reopen")
                    ),
                },
              ]
            );
            return;
          }
          void runAction(() =>
            runMatchConsoleAction(slug!, matchSlug!, action)
          );
        }}
        onSaveSet={async (setNumber, teamAScore, teamBScore) => {
          setBusy(true);
          setActionError(null);
          try {
            const result = await saveMatchSetScore(
              slug!,
              matchSlug!,
              setNumber,
              teamAScore,
              teamBScore
            );
            await applyConsole(result.console);
          } catch (cause) {
            setActionError(messageFor(cause, "Could not save the score."));
          } finally {
            setBusy(false);
          }
        }}
        onCrewAction={(action, role) => {
          void runAction(() => {
            if (action === "claim") {
              return runMatchCrewAction(slug!, matchSlug!, "claim", { role });
            }
            return runMatchCrewAction(slug!, matchSlug!, action);
          });
        }}
      />
    </ScrollView>
  );
}

function matchTitle(match: MatchConsoleContract): string {
  const a = match.teamA?.name ?? "TBD";
  const b = match.teamB?.name ?? "TBD";
  return `${a} vs ${b}`;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  busyRow: { alignItems: "center" },
});
