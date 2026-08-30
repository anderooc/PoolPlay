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
  TournamentHostDivisionPoolsContract,
  TournamentHostPoolContract,
  TournamentHostPoolsContract,
} from "@/lib/api/contracts/tournament-host";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  fetchTournamentHostPools,
  releaseTournamentHostDivisionPools,
  updateTournamentHostPoolSeeding,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { FormSubmitButton } from "~/components/create-form";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function TournamentHostPoolsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [payload, setPayload] = useState<TournamentHostPoolsContract | null>(
    null
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentHostPools(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load pools."
  );

  useEffect(() => {
    if (data) setPayload(data.pools);
  }, [data]);

  const pools = payload ?? data?.pools ?? null;

  const runAction = useCallback(
    async (
      key: string,
      action: () => Promise<{ pools: TournamentHostPoolsContract }>
    ) => {
      setBusyKey(key);
      setActionError(null);
      try {
        const result = await action();
        setPayload(result.pools);
      } catch (cause) {
        setActionError(messageFor(cause, "Could not update pools."));
      } finally {
        setBusyKey(null);
      }
    },
    []
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!slug) {
    return (
      <ErrorScreen
        title="Missing tournament"
        message="No tournament was specified."
        onRetry={() => void refresh()}
      />
    );
  }
  if (error && !pools) {
    return (
      <ErrorScreen
        title="Pools unavailable"
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!pools) return <LoadingScreen />;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: colors.background },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setPayload(null);
            void refresh();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {pools.poolAssignmentBlocked ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {pools.poolAssignmentBlocked}
        </Text>
      ) : null}
      {actionError ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {actionError}
        </Text>
      ) : null}

      <Pressable
        onPress={() => router.push(`/tournament/${slug}/pools`)}
        style={[styles.viewLink, { borderColor: colors.border }]}
      >
        <Text style={[styles.viewLinkTitle, { color: colors.foreground }]}>
          View public pools
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Standings and matches participants see after release
        </Text>
      </Pressable>

      {pools.divisions.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          Add pools on the Setup screen before seeding teams.
        </Text>
      ) : (
        pools.divisions.map((division) => (
          <DivisionPoolsCard
            key={division.id}
            division={division}
            canAssignPools={pools.canAssignPools}
            busyKey={busyKey}
            colors={colors}
            onRelease={() =>
              Alert.alert(
                "Release pools?",
                `${division.name} will become visible to all participants.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Release",
                    onPress: () =>
                      void runAction(`release-${division.id}`, () =>
                        releaseTournamentHostDivisionPools(
                          slug,
                          division.id
                        ).then((result) => ({ pools: result.pools }))
                      ),
                  },
                ]
              )
            }
            onSaveSeeding={(poolId, teamIds) =>
              void runAction(`seed-${poolId}`, () =>
                updateTournamentHostPoolSeeding(slug, poolId, teamIds).then(
                  (result) => ({ pools: result.pools })
                )
              )
            }
          />
        ))
      )}
    </ScrollView>
  );
}

function DivisionPoolsCard({
  division,
  canAssignPools,
  busyKey,
  colors,
  onRelease,
  onSaveSeeding,
}: {
  division: TournamentHostDivisionPoolsContract;
  canAssignPools: boolean;
  busyKey: string | null;
  colors: ReturnType<typeof useThemeColors>;
  onRelease: () => void;
  onSaveSeeding: (poolId: string, teamIds: string[]) => void;
}) {
  const released = division.poolsReleasedAt != null;

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={[styles.divisionName, { color: colors.foreground }]}>
        {division.name}
      </Text>

      {released ? (
        <View
          style={[
            styles.released,
            { backgroundColor: withAlpha(colors.primary, 0.08) },
          ]}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            Released to participants
          </Text>
        </View>
      ) : (
        <View style={styles.releaseBlock}>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Host only — not visible to participants until you release.
          </Text>
          <FormSubmitButton
            label="Release to participants"
            busy={busyKey === `release-${division.id}`}
            disabled={division.matchCount === 0}
            colors={colors}
            onPress={onRelease}
          />
          {division.matchCount === 0 ? (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Save seeding to generate matches before releasing.
            </Text>
          ) : null}
        </View>
      )}

      {division.pools.length === 0 ||
      division.pools.every((pool) => pool.teams.length === 0) ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Assign confirmed teams to this pool from Registrations.
        </Text>
      ) : (
        division.pools.map((pool) =>
          division.format === "pool_to_bracket" ? (
            <PoolSeedingCard
              key={pool.id}
              pool={pool}
              canEdit={canAssignPools}
              busy={busyKey === `seed-${pool.id}`}
              colors={colors}
              onSave={onSaveSeeding}
            />
          ) : (
            <View key={pool.id} style={styles.poolMeta}>
              <Text style={[styles.poolName, { color: colors.foreground }]}>
                {pool.name}
              </Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {pool.matchCount} matches · {pool.teams.length} teams
              </Text>
            </View>
          )
        )
      )}
    </View>
  );
}

function PoolSeedingCard({
  pool,
  canEdit,
  busy,
  colors,
  onSave,
}: {
  pool: TournamentHostPoolContract;
  canEdit: boolean;
  busy: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onSave: (poolId: string, teamIds: string[]) => void;
}) {
  const sorted = [...pool.teams].sort((a, b) => {
    const sa = a.seed ?? Number.MAX_SAFE_INTEGER;
    const sb = b.seed ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });
  const [order, setOrder] = useState(() => sorted.map((team) => team.id));

  useEffect(() => {
    setOrder(sorted.map((team) => team.id));
  }, [pool.id, pool.teams.map((team) => `${team.id}:${team.seed}`).join(",")]);

  const teamById = new Map(pool.teams.map((team) => [team.id, team]));
  const locked = pool.matchesStarted || !canEdit;

  if (pool.teams.length < 2) {
    return (
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Add at least 2 teams to {pool.name} before setting seeds.
      </Text>
    );
  }

  const move = (index: number, direction: -1 | 1) => {
    setOrder((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <View style={styles.seeding}>
      <Text style={[styles.poolName, { color: colors.foreground }]}>
        Seeding — {pool.name}
      </Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Seed 1 is top seed. Saving creates round-robin matches.
      </Text>
      {order.map((teamId, index) => {
        const team = teamById.get(teamId);
        if (!team) return null;
        return (
          <View
            key={teamId}
            style={[styles.seedRow, { borderColor: colors.border }]}
          >
            <Text style={[styles.seedRank, { color: colors.primary }]}>
              {index + 1}
            </Text>
            <View style={styles.seedText}>
              <Text style={[styles.teamName, { color: colors.foreground }]}>
                {team.name}
              </Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {team.university}
              </Text>
            </View>
            {!locked ? (
              <View style={styles.seedControls}>
                <Pressable
                  disabled={busy || index === 0}
                  onPress={() => move(index, -1)}
                  style={styles.seedButton}
                >
                  <Text style={{ color: colors.primary }}>↑</Text>
                </Pressable>
                <Pressable
                  disabled={busy || index === order.length - 1}
                  onPress={() => move(index, 1)}
                  style={styles.seedButton}
                >
                  <Text style={{ color: colors.primary }}>↓</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
      {pool.matchesStarted ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Matches have started — seeding is locked.
        </Text>
      ) : null}
      {!locked ? (
        <FormSubmitButton
          label="Save seeding & generate matches"
          busy={busy}
          colors={colors}
          onPress={() => onSave(pool.id, order)}
        />
      ) : null}
      {pool.matchCount > 0 ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {pool.completedMatchCount} of {pool.matchCount} matches complete
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  hint: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13 },
  empty: { fontSize: 14, lineHeight: 20 },
  viewLink: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  viewLinkTitle: { fontSize: 15, fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  divisionName: { fontSize: 18, fontWeight: "800" },
  released: {
    borderRadius: 10,
    padding: 10,
  },
  releaseBlock: { gap: 8 },
  poolMeta: { gap: 4 },
  poolName: { fontSize: 16, fontWeight: "700" },
  seeding: { gap: 8 },
  seedRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  seedRank: {
    width: 24,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  seedText: { flex: 1, gap: 2 },
  teamName: { fontSize: 15, fontWeight: "600" },
  seedControls: { flexDirection: "row", gap: 4 },
  seedButton: { paddingHorizontal: 8, paddingVertical: 4 },
});
