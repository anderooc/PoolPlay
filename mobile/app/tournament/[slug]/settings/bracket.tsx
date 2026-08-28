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
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
  fetchTournamentBracketSettings,
  updateTournamentBracketSettings,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { BRACKET_COUNT_OPTIONS } from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function BracketSettingsScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [draft, setDraft] = useState<TournamentBracketSettingsContract | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) =>
      fetchTournamentBracketSettings(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load bracket settings."
  );

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

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
  if ((data === null || draft === null) && error === null) {
    return <LoadingScreen />;
  }
  if (!data || !draft) {
    return (
      <ErrorScreen
        title="Bracket settings unavailable"
        message={error ?? "Only the tournament host can edit these settings."}
        onRetry={() => void refresh()}
      />
    );
  }

  async function onSave() {
    if (!draft || busy) return;
    setBusy(true);
    setActionError(null);
    setSaved(false);
    try {
      const next = await updateTournamentBracketSettings(slug!, {
        bracketCount: draft.bracketCount,
        goldTeamCount: draft.goldTeamCount,
        silverTeamCount: draft.silverTeamCount,
      });
      setDraft(next);
      setSaved(true);
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Could not save bracket settings."));
    } finally {
      setBusy(false);
    }
  }

  const locked = draft.locked && !draft.canRegenerate;

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
          Bracket settings
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          How pool teams advance into gold / silver / bronze after pool play.
        </Text>

        {!draft.hasPoolToBracket ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            Add a pool-to-bracket division on the web Setup tab before configuring
            bracket tiers.
          </Text>
        ) : null}

        {locked ? (
          <Text style={{ color: colors.destructive, fontSize: 14 }}>
            {draft.regenerateBlockedReason ??
              "Bracket settings are locked while bracket play is in progress."}
          </Text>
        ) : null}

        <Text style={[styles.section, { color: colors.foreground }]}>
          Structure
        </Text>
        {BRACKET_COUNT_OPTIONS.map((option) => {
          const selected = draft.bracketCount === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              disabled={locked}
              onPress={() =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        bracketCount: option.value,
                        goldTeamCount:
                          option.value >= 2 ? (prev.goldTeamCount ?? 4) : null,
                        silverTeamCount:
                          option.value === 3
                            ? (prev.silverTeamCount ?? 4)
                            : null,
                      }
                    : prev
                )
              }
              style={[
                styles.option,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected
                    ? withAlpha(colors.primary, 0.1)
                    : "transparent",
                  opacity: locked ? 0.5 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}

        {draft.bracketCount >= 2 ? (
          <>
            <Text style={[styles.section, { color: colors.foreground }]}>
              Gold teams
            </Text>
            <TextInput
              editable={!locked}
              keyboardType="number-pad"
              value={
                draft.goldTeamCount == null ? "" : String(draft.goldTeamCount)
              }
              onChangeText={(text) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        goldTeamCount:
                          text.trim() === ""
                            ? null
                            : Number.parseInt(text, 10) || null,
                      }
                    : prev
                )
              }
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. 8"
              placeholderTextColor={colors.mutedForeground}
            />
          </>
        ) : null}

        {draft.bracketCount === 3 ? (
          <>
            <Text style={[styles.section, { color: colors.foreground }]}>
              Silver teams
            </Text>
            <TextInput
              editable={!locked}
              keyboardType="number-pad"
              value={
                draft.silverTeamCount == null
                  ? ""
                  : String(draft.silverTeamCount)
              }
              onChangeText={(text) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        silverTeamCount:
                          text.trim() === ""
                            ? null
                            : Number.parseInt(text, 10) || null,
                      }
                    : prev
                )
              }
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. 8"
              placeholderTextColor={colors.mutedForeground}
            />
          </>
        ) : null}

        {draft.totalBracketTeams > 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            {draft.totalBracketTeams} teams currently in pool play for brackets.
          </Text>
        ) : null}

        {actionError ? (
          <Text style={{ color: colors.destructive }}>{actionError}</Text>
        ) : null}
        {saved ? (
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Saved.
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          disabled={busy || locked || !draft.hasPoolToBracket}
          onPress={() => void onSave()}
          style={[
            styles.save,
            {
              backgroundColor: colors.primary,
              opacity: busy || locked || !draft.hasPoolToBracket ? 0.5 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
              Save bracket settings
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  section: { fontSize: 17, fontWeight: "700", marginTop: 12 },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
  save: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
