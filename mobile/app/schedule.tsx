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

import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { fetchGlobalSchedule } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { useThemeColors } from "~/theme/colors";
import { GlobalSchedulePanel } from "~/tournament/global-schedule-panel";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor } from "~/tournament/use-public-loader";

export default function ScheduleScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const [matches, setMatches] = useState<
    Awaited<ReturnType<typeof fetchGlobalSchedule>>["matches"]
  >([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    const schedule = await fetchGlobalSchedule(signal);
    setMatches(schedule.matches);
    setError(null);
    setReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      const controller = new AbortController();
      void load(controller.signal).catch((cause) => {
        if (controller.signal.aborted) return;
        setError(messageFor(cause, "Could not load schedule."));
        setReady(true);
      });
      return () => controller.abort();
    }, [session, load])
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!ready && !error) return <LoadingScreen />;
  if (error && matches.length === 0) {
    return (
      <ErrorScreen
        title="Could not load schedule"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            void load()
              .catch((cause) =>
                setError(messageFor(cause, "Could not load schedule."))
              )
              .finally(() => setIsRefreshing(false));
          }}
        />
      }
    >
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        All scheduled matches across tournaments.
      </Text>
      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}
      <GlobalSchedulePanel matches={matches} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  lead: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13 },
});
