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

import type {
  PlayDivisionContract,
  PlayPoolContract,
} from "@/lib/api/contracts/tournament";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchTournamentPlay } from "~/api/endpoints";
import { formatSigned } from "~/lib/format";
import { HostSettingsEntry } from "~/tournament/host-settings-entry";
import { MatchRow } from "~/tournament/match-row";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { usePublicLoader } from "~/tournament/use-public-loader";
import { useThemeColors, type ThemeColors } from "~/theme/colors";

export default function PoolsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!slug) return Promise.reject(new Error("Tournament not found."));
      return fetchTournamentPlay(slug, signal);
    },
    [slug]
  );

  const { data, error, isRefreshing, reload, refresh } = usePublicLoader(
    load,
    "Could not load pools."
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Pools" });
  }, [navigation]);

  if (data === null && error === null) return <LoadingScreen />;
  if (!data) {
    return (
      <ErrorScreen
        title="Pools unavailable"
        message={error ?? "Could not load pools."}
        onRetry={() => void reload()}
      />
    );
  }

  const withPools = data.divisions.filter(
    (division) =>
      division.format === "pool_to_bracket" || division.pools.length > 0
  );

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
      {slug ? (
        <HostSettingsEntry
          slug={slug}
          href={`/tournament/${slug}/settings/pool`}
          title="Pool settings"
          detail="Match format, scoring, and tie-breaks"
        />
      ) : null}
      {withPools.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          This tournament goes straight to the bracket. Open Bracket to follow
          elimination rounds.
        </Text>
      ) : (
        withPools.map((division) => (
          <DivisionPools
            key={division.name}
            division={division}
            colors={colors}
            onMatchPress={(matchSlug) =>
              router.push(`/tournament/${slug}/matches/${matchSlug}`)
            }
          />
        ))
      )}
    </ScrollView>
  );
}

function DivisionPools({
  division,
  colors,
  onMatchPress,
}: {
  division: PlayDivisionContract;
  colors: ThemeColors;
  onMatchPress: (matchSlug: string) => void;
}) {
  return (
    <View style={styles.division}>
      <Text style={[styles.divisionName, { color: colors.foreground }]}>
        {division.name}
      </Text>
      {!division.released ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          The host has not posted pools yet. Standings appear here once they
          release play.
        </Text>
      ) : division.pools.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          No pool groups in this division.
        </Text>
      ) : (
        division.pools.map((pool) => (
          <PoolBlock
            key={pool.name}
            divisionName={division.name}
            pool={pool}
            colors={colors}
            onMatchPress={onMatchPress}
          />
        ))
      )}
    </View>
  );
}

function PoolBlock({
  divisionName,
  pool,
  colors,
  onMatchPress,
}: {
  divisionName: string;
  pool: PlayPoolContract;
  colors: ThemeColors;
  onMatchPress: (matchSlug: string) => void;
}) {
  return (
    <View style={styles.pool}>
      {pool.name !== divisionName ? (
        <Text style={[styles.poolName, { color: colors.foreground }]}>
          {pool.name}
        </Text>
      ) : null}
      <View style={[styles.table, { borderColor: colors.border }]}>
        <View style={styles.tableHead}>
          <Text style={[styles.rank, { color: colors.mutedForeground }]}>#</Text>
          <Text style={[styles.teamCol, { color: colors.mutedForeground }]}>
            Team
          </Text>
          <Text style={[styles.stat, { color: colors.mutedForeground }]}>
            W-L
          </Text>
          <Text style={[styles.stat, { color: colors.mutedForeground }]}>
            Sets
          </Text>
          <Text style={[styles.stat, { color: colors.mutedForeground }]}>
            +/−
          </Text>
        </View>
        {pool.standings.map((row, index) => (
          <View key={row.teamSlug} style={styles.tableRow}>
            <Text style={[styles.rank, { color: colors.mutedForeground }]}>
              {index + 1}
            </Text>
            <Text
              style={[styles.teamCol, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {row.teamName}
            </Text>
            <Text style={[styles.stat, { color: colors.foreground }]}>
              {row.wins}–{row.losses}
            </Text>
            <Text style={[styles.stat, { color: colors.foreground }]}>
              {row.setsWon}–{row.setsLost}
            </Text>
            <Text style={[styles.stat, { color: colors.foreground }]}>
              {formatSigned(row.pointDiff)}
            </Text>
          </View>
        ))}
      </View>
      {pool.matches.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          Matches appear here after the host schedules the pool.
        </Text>
      ) : (
        <View style={styles.matches}>
          {pool.matches.map((match) => (
            <MatchRow
              key={match.slug}
              match={match}
              compact
              onPress={() => onMatchPress(match.slug)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 28 },
  division: { gap: 16 },
  divisionName: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  pool: { gap: 12 },
  poolName: { fontSize: 17, fontWeight: "700" },
  table: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  rank: { width: 20, fontSize: 13, fontVariant: ["tabular-nums"] },
  teamCol: { flex: 1, fontSize: 15, fontWeight: "600" },
  stat: {
    width: 40,
    fontSize: 13,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  matches: { gap: 10 },
  empty: { fontSize: 15, lineHeight: 22 },
});
