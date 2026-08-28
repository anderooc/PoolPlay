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

import type { TournamentPoolSettingsContract } from "@/lib/api/contracts/tournament-ops";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import {
  fetchTournamentPoolSettings,
  updateTournamentPoolSettings,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  MATCH_FORMAT_OPTIONS,
  POOL_TIEBREAK_OPTIONS,
  WARMUP_FORMAT_OPTIONS,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateTiebreakReorder() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function PoolSettingsScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [draft, setDraft] = useState<TournamentPoolSettingsContract | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentPoolSettings(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load pool settings."
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
        title="Pool settings unavailable"
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
      const next = await updateTournamentPoolSettings(slug!, draft);
      setDraft(next);
      setSaved(true);
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Could not save pool settings."));
    } finally {
      setBusy(false);
    }
  }

  function moveCriterion(index: number, direction: -1 | 1) {
    if (!draft) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.poolTiebreakCriteria.length) {
      return;
    }
    animateTiebreakReorder();
    setDraft((prev) => {
      if (!prev) return prev;
      const criteria = [...prev.poolTiebreakCriteria];
      const [item] = criteria.splice(index, 1);
      criteria.splice(nextIndex, 0, item!);
      return { ...prev, poolTiebreakCriteria: criteria };
    });
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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Pool settings
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Match format, scoring, warmup, and standings tie-break order for pool
          play.
        </Text>

        <Text style={[styles.section, { color: colors.foreground }]}>
          Match format
        </Text>
        {MATCH_FORMAT_OPTIONS.map((option) => {
          const selected = draft.matchFormat === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() =>
                setDraft((prev) =>
                  prev ? { ...prev, matchFormat: option.value } : prev
                )
              }
              style={[
                styles.option,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected
                    ? withAlpha(colors.primary, 0.1)
                    : "transparent",
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}

        <Text style={[styles.section, { color: colors.foreground }]}>
          Scoring
        </Text>
        <View style={styles.scoreRow}>
          <Field
            label="Start"
            value={String(draft.setStartingScore)}
            onChange={(text) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      setStartingScore: Number.parseInt(text || "0", 10) || 0,
                    }
                  : prev
              )
            }
            colors={colors}
          />
          <Field
            label="Target"
            value={String(draft.setTargetScore)}
            onChange={(text) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      setTargetScore: Number.parseInt(text || "0", 10) || 0,
                    }
                  : prev
              )
            }
            colors={colors}
          />
          <Field
            label="TB"
            value={String(draft.tiebreakTargetScore)}
            onChange={(text) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      tiebreakTargetScore:
                        Number.parseInt(text || "0", 10) || 0,
                    }
                  : prev
              )
            }
            colors={colors}
          />
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>
          Warmup
        </Text>
        {WARMUP_FORMAT_OPTIONS.map((option) => {
          const selected = draft.warmupFormat === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() =>
                setDraft((prev) =>
                  prev ? { ...prev, warmupFormat: option.value } : prev
                )
              }
              style={[
                styles.option,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected
                    ? withAlpha(colors.primary, 0.1)
                    : "transparent",
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}

        <Text style={[styles.section, { color: colors.foreground }]}>
          Tie-break order
        </Text>
        <View style={styles.tieList}>
          {draft.poolTiebreakCriteria.map((criterion, index) => {
            const label =
              POOL_TIEBREAK_OPTIONS.find((item) => item.value === criterion)
                ?.label ?? criterion;
            return (
              <View
                key={criterion}
                style={[styles.tieRow, { borderColor: colors.border }]}
              >
                <Text
                  style={{
                    flex: 1,
                    color: colors.foreground,
                    fontWeight: "600",
                  }}
                >
                  {index + 1}. {label}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move up"
                  disabled={index === 0}
                  onPress={() => moveCriterion(index, -1)}
                  style={[styles.tieBtn, { opacity: index === 0 ? 0.35 : 1 }]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    ↑
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move down"
                  disabled={index === draft.poolTiebreakCriteria.length - 1}
                  onPress={() => moveCriterion(index, 1)}
                  style={[
                    styles.tieBtn,
                    {
                      opacity:
                        index === draft.poolTiebreakCriteria.length - 1
                          ? 0.35
                          : 1,
                    },
                  ]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    ↓
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

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
          disabled={busy}
          onPress={() => void onSave()}
          style={[
            styles.save,
            { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
              Save pool settings
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{label}</Text>
      <TextInput
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />
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
  scoreRow: { flexDirection: "row", gap: 10 },
  field: { flex: 1, gap: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  tieList: { gap: 10 },
  tieRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tieBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
  save: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
