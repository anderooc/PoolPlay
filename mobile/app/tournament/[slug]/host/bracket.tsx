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

import type { TournamentBracketSettingsContract } from "@/lib/api/contracts/tournament-ops";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
  fetchTournamentHostBrackets,
  regenerateTournamentHostBrackets,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { FormSubmitButton } from "~/components/create-form";
import { BRACKET_COUNT_OPTIONS } from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

function bracketStructureLabel(settings: TournamentBracketSettingsContract) {
  const option = BRACKET_COUNT_OPTIONS.find(
    (row) => row.value === settings.bracketCount
  );
  return option?.label ?? `${settings.bracketCount} bracket(s)`;
}

export default function TournamentHostBracketScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [settings, setSettings] =
    useState<TournamentBracketSettingsContract | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentHostBrackets(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load bracket ops."
  );

  const current = settings ?? data?.settings ?? null;

  const onRegenerate = useCallback(() => {
    if (!slug || !current?.canRegenerate) return;
    Alert.alert(
      "Regenerate brackets?",
      "This clears current bracket matches and re-seeds gold / silver / bronze from the latest pool standings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            setActionError(null);
            void regenerateTournamentHostBrackets(slug)
              .then((result) => {
                setSettings(result.settings);
              })
              .catch((cause) => {
                setActionError(
                  messageFor(cause, "Could not regenerate brackets.")
                );
              })
              .finally(() => setBusy(false));
          },
        },
      ]
    );
  }, [current?.canRegenerate, slug]);

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
  if (error && !current) {
    return (
      <ErrorScreen
        title="Bracket ops unavailable"
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!current) return <LoadingScreen />;

  const locked = current.locked && !current.canRegenerate;

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
            setSettings(null);
            void refresh();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {actionError ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {actionError}
        </Text>
      ) : null}

      <Pressable
        onPress={() => router.push(`/tournament/${slug}/bracket`)}
        style={[styles.link, { borderColor: colors.border }]}
      >
        <Text style={[styles.linkTitle, { color: colors.foreground }]}>
          View public bracket
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Elimination draw participants see after pools are released
        </Text>
      </Pressable>

      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Tier settings
        </Text>
        {!current.hasPoolToBracket ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Add a pool-to-bracket division before configuring brackets.
          </Text>
        ) : (
          <>
            <Text style={[styles.meta, { color: colors.foreground }]}>
              {bracketStructureLabel(current)}
            </Text>
            {current.bracketCount >= 2 ? (
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Gold: {current.goldTeamCount ?? "—"}
                {current.bracketCount === 3
                  ? ` · Silver: ${current.silverTeamCount ?? "—"}`
                  : ""}
              </Text>
            ) : null}
            {current.totalBracketTeams > 0 ? (
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {current.totalBracketTeams} teams in pool play for brackets
              </Text>
            ) : null}
            <Pressable
              onPress={() => router.push(`/tournament/${slug}/settings/bracket`)}
              style={[styles.editLink, { borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Edit bracket settings
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Regenerate
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Re-seed gold / silver / bronze from current pool standings. Only
          available before any bracket match has been played.
        </Text>
        {locked ? (
          <View
            style={[
              styles.locked,
              { backgroundColor: withAlpha(colors.destructive, 0.08) },
            ]}
          >
            <Text style={{ color: colors.destructive, fontSize: 13 }}>
              {current.regenerateBlockedReason ??
                "Bracket regeneration is not available right now."}
            </Text>
          </View>
        ) : null}
        <FormSubmitButton
          label="Regenerate brackets"
          busy={busy}
          disabled={!current.canRegenerate || !current.hasPoolToBracket}
          colors={colors}
          onPress={onRegenerate}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  error: { fontSize: 13 },
  hint: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 15, fontWeight: "600" },
  link: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  linkTitle: { fontSize: 15, fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: "800" },
  editLink: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locked: {
    borderRadius: 10,
    padding: 10,
  },
});
