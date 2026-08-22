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

import type { TournamentMatchDetailContract } from "@/lib/api/contracts/tournament";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchTournamentMatch } from "~/api/endpoints";
import {
  formatMatchTime,
  MATCH_STATUS_LABELS,
} from "~/lib/format";
import { usePolling } from "~/lib/use-polling";
import { SectionBack } from "~/tournament/section-back";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { usePublicLoader } from "~/tournament/use-public-loader";
import { useThemeColors, type ThemeColors } from "~/theme/colors";

export default function MatchDetailScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const { slug, matchSlug } = useLocalSearchParams<{
    slug: string;
    matchSlug: string;
  }>();

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!slug || !matchSlug) {
        return Promise.reject(new Error("Match not found."));
      }
      return fetchTournamentMatch(slug, matchSlug, signal);
    },
    [slug, matchSlug]
  );

  const { data, error, isRefreshing, reload, refresh, poll } = usePublicLoader(
    load,
    "Could not load this match."
  );

  usePolling(poll, 5000, data?.status === "in_progress");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: data ? matchTitle(data) : "Match",
    });
  }, [navigation, data]);

  if (data === null && error === null) return <LoadingScreen />;
  if (!data) {
    return (
      <ErrorScreen
        title="Match unavailable"
        message={error ?? "Could not load this match."}
        onRetry={() => void reload()}
      />
    );
  }

  const status = MATCH_STATUS_LABELS[data.status] ?? data.status;
  const meta = [
    data.scheduledTime ? formatMatchTime(data.scheduledTime) : null,
    data.courtName,
    data.divisionName,
    data.phase === "bracket" ? "Bracket" : "Pool",
  ]
    .filter(Boolean)
    .join(" · ");

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
      <SectionBack
        label="Tournament"
        fallbackHref={slug ? `/tournament/${slug}` : "/"}
      />
      <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
        {data.tournamentName}
      </Text>
      <Text
        style={[
          styles.status,
          {
            color:
              data.status === "in_progress" ? colors.primary : colors.foreground,
          },
        ]}
      >
        {status}
      </Text>
      {meta ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {meta}
        </Text>
      ) : null}

      <View style={[styles.board, { borderColor: colors.border }]}>
        <View style={styles.boardHead}>
          <Text style={[styles.boardSpacer, { color: colors.mutedForeground }]}>
            Set
          </Text>
          <Text
            style={[
              styles.boardCol,
              {
                color: colors.foreground,
                fontWeight: data.winnerSlug === data.teamA?.slug ? "700" : "600",
              },
            ]}
            numberOfLines={2}
          >
            {data.teamA?.name ?? "TBD"}
          </Text>
          <Text
            style={[
              styles.boardCol,
              {
                color: colors.foreground,
                fontWeight: data.winnerSlug === data.teamB?.slug ? "700" : "600",
              },
            ]}
            numberOfLines={2}
          >
            {data.teamB?.name ?? "TBD"}
          </Text>
        </View>
        {data.sets.length === 0 ? (
          <Text style={[styles.emptySets, { color: colors.mutedForeground }]}>
            {data.status === "upcoming"
              ? "Sets appear here when the match starts."
              : "No set scores posted yet."}
          </Text>
        ) : (
          data.sets
            .slice()
            .sort((a, b) => a.setNumber - b.setNumber)
            .map((set) => (
              <SetRow key={set.setNumber} set={set} colors={colors} />
            ))
        )}
      </View>

      {data.refTeamName ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Ref: {data.refTeamName}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function SetRow({
  set,
  colors,
}: {
  set: TournamentMatchDetailContract["sets"][number];
  colors: ThemeColors;
}) {
  const aWon = set.teamAScore > set.teamBScore;
  const bWon = set.teamBScore > set.teamAScore;
  return (
    <View style={styles.setRow}>
      <Text style={[styles.boardSpacer, { color: colors.mutedForeground }]}>
        {set.setNumber}
      </Text>
      <Text
        style={[
          styles.score,
          { color: colors.foreground, fontWeight: aWon ? "700" : "500" },
        ]}
      >
        {set.teamAScore}
      </Text>
      <Text
        style={[
          styles.score,
          { color: colors.foreground, fontWeight: bWon ? "700" : "500" },
        ]}
      >
        {set.teamBScore}
      </Text>
    </View>
  );
}

function matchTitle(match: TournamentMatchDetailContract): string {
  const a = match.teamA?.name ?? "TBD";
  const b = match.teamB?.name ?? "TBD";
  return `${a} vs ${b}`;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  kicker: { fontSize: 14, fontWeight: "600" },
  status: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  meta: { fontSize: 15 },
  board: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  boardHead: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  boardSpacer: { width: 36, fontSize: 13, fontWeight: "600" },
  boardCol: { flex: 1, fontSize: 16, textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  score: {
    flex: 1,
    fontSize: 28,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  emptySets: { fontSize: 15, lineHeight: 22 },
});
