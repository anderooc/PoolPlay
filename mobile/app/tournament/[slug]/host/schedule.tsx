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
  TournamentHostScheduleContract,
  TournamentHostScheduleGroupContract,
  TournamentHostScheduleMatchContract,
} from "@/lib/api/contracts/tournament-host";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  applyTournamentHostScheduleFill,
  fetchTournamentHostSchedule,
  updateTournamentHostMatchSchedule,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  ChipPicker,
  FormField,
  FormSubmitButton,
  FormTextInput,
} from "~/components/create-form";
import { formatMatchTime, MATCH_STATUS_LABELS } from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

const DEFAULT_INTERVAL = "60";

function parseClockOnTournamentDate(
  tournamentDate: string,
  clock: string
): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  const [year, month, day] = tournamentDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, mins, 0, 0)).toISOString();
}

function scheduledTimeToClock(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const hours = parsed.getUTCHours().toString().padStart(2, "0");
  const mins = parsed.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function earliestScheduledClock(
  matches: TournamentHostScheduleMatchContract[]
): string {
  let earliestMs = Number.POSITIVE_INFINITY;
  let clock = "09:00";
  for (const match of matches) {
    if (!match.scheduledTime || match.isBye) continue;
    const ms = new Date(match.scheduledTime).getTime();
    if (Number.isNaN(ms) || ms >= earliestMs) continue;
    earliestMs = ms;
    clock = scheduledTimeToClock(match.scheduledTime);
  }
  return clock;
}

export default function TournamentHostScheduleScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [schedule, setSchedule] = useState<TournamentHostScheduleContract | null>(
    null
  );
  const [groupId, setGroupId] = useState("");
  const [firstStart, setFirstStart] = useState("09:00");
  const [intervalText, setIntervalText] = useState(DEFAULT_INTERVAL);
  const [overwrite, setOverwrite] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [matchClocks, setMatchClocks] = useState<Record<string, string>>({});

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentHostSchedule(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load schedule."
  );

  useEffect(() => {
    if (!data) return;
    setSchedule(data.schedule);
    if (!groupId && data.schedule.groups[0]) {
      setGroupId(data.schedule.groups[0].id);
    }
  }, [data, groupId]);

  const groups = schedule?.groups ?? [];
  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId) ?? groups[0] ?? null,
    [groupId, groups]
  );

  useEffect(() => {
    if (!selectedGroup || !schedule) return;
    setFirstStart(earliestScheduledClock(selectedGroup.matches));
    const clocks: Record<string, string> = {};
    for (const match of selectedGroup.matches) {
      clocks[match.id] = scheduledTimeToClock(match.scheduledTime);
    }
    setMatchClocks(clocks);
  }, [schedule, selectedGroup?.id]);

  const groupLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const group of groups) {
      labels[group.id] = `${group.label} (${group.scheduledCount}/${group.totalCount})`;
    }
    return labels;
  }, [groups]);

  const runAction = useCallback(
    async <T,>(key: string, action: () => Promise<T>): Promise<T | null> => {
      setBusyKey(key);
      setActionError(null);
      try {
        return await action();
      } catch (cause) {
        setActionError(messageFor(cause, "Could not update schedule."));
        return null;
      } finally {
        setBusyKey(null);
      }
    },
    []
  );

  const onApplyFill = useCallback(async () => {
    if (!slug || !schedule || !selectedGroup || !schedule.canSchedule) return;
    const firstStartIso = parseClockOnTournamentDate(schedule.date, firstStart);
    if (!firstStartIso) {
      setActionError("Enter a valid first start time (HH:MM).");
      return;
    }
    const intervalMinutes = Number(intervalText);
    if (!Number.isFinite(intervalMinutes) || intervalMinutes < 5) {
      setActionError("Interval must be at least 5 minutes.");
      return;
    }

    const result = await runAction("fill", () =>
      applyTournamentHostScheduleFill(slug, {
        scope: selectedGroup.scope,
        firstStartIso,
        intervalMinutes,
        overwrite,
      })
    );
    if (result) {
      setSchedule(result.schedule);
    }
  }, [
    firstStart,
    intervalText,
    overwrite,
    runAction,
    schedule,
    selectedGroup,
    slug,
  ]);

  const onSaveMatchTime = useCallback(
    async (match: TournamentHostScheduleMatchContract) => {
      if (!slug || !schedule?.canSchedule || match.isBye) return;
      const clock = matchClocks[match.id] ?? "";
      const scheduledTime =
        clock.trim() === ""
          ? null
          : parseClockOnTournamentDate(schedule.date, clock);
      if (clock.trim() !== "" && !scheduledTime) {
        setActionError("Enter a valid time (HH:MM) or leave blank to clear.");
        return;
      }

      const result = await runAction(`match-${match.id}`, () =>
        updateTournamentHostMatchSchedule(slug, match.id, scheduledTime)
      );
      if (result) setSchedule(result.schedule);
    },
    [matchClocks, runAction, schedule, slug]
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
  if (error && !schedule) {
    return (
      <ErrorScreen
        title="Schedule unavailable"
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!schedule) return <LoadingScreen />;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: colors.background },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.hero, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Match times
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Tournament date {schedule.date}
          {schedule.canSchedule ? "" : " · read-only"}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/tournament/${slug}?tab=matches`)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.link, { color: colors.primary }]}>
            View public matches →
          </Text>
        </Pressable>
      </View>

      {groups.length === 0 ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          No matches yet. Release pools or generate brackets first.
        </Text>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Group
            </Text>
            <ChipPicker
              options={groups.map((group) => group.id)}
              value={selectedGroup?.id ?? ""}
              onChange={setGroupId}
              colors={colors}
              labels={groupLabels}
            />
          </View>

          {selectedGroup && schedule.canSchedule ? (
            <BulkFillSection
              colors={colors}
              firstStart={firstStart}
              intervalText={intervalText}
              overwrite={overwrite}
              busy={busyKey === "fill"}
              onFirstStartChange={setFirstStart}
              onIntervalChange={setIntervalText}
              onOverwriteChange={setOverwrite}
              onApply={() => void onApplyFill()}
            />
          ) : null}

          {selectedGroup ? (
            <MatchListSection
              colors={colors}
              group={selectedGroup}
              canSchedule={schedule.canSchedule}
              matchClocks={matchClocks}
              busyKey={busyKey}
              onClockChange={(matchId, clock) =>
                setMatchClocks((current) => ({ ...current, [matchId]: clock }))
              }
              onSave={(match) => void onSaveMatchTime(match)}
            />
          ) : null}
        </>
      )}

      {actionError ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {actionError}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function BulkFillSection({
  colors,
  firstStart,
  intervalText,
  overwrite,
  busy,
  onFirstStartChange,
  onIntervalChange,
  onOverwriteChange,
  onApply,
}: {
  colors: ReturnType<typeof useThemeColors>;
  firstStart: string;
  intervalText: string;
  overwrite: boolean;
  busy: boolean;
  onFirstStartChange: (value: string) => void;
  onIntervalChange: (value: string) => void;
  onOverwriteChange: (value: boolean) => void;
  onApply: () => void;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: withAlpha(colors.primary, 0.04),
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Bulk fill
      </Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Assign start times in waves using a fixed interval. Locked matches are
        skipped.
      </Text>
      <FormField label="First start" colors={colors} hint="24-hour HH:MM">
        <FormTextInput
          value={firstStart}
          onChangeText={onFirstStartChange}
          placeholder="09:00"
          colors={colors}
          autoCapitalize="none"
        />
      </FormField>
      <FormField label="Interval (minutes)" colors={colors}>
        <FormTextInput
          value={intervalText}
          onChangeText={onIntervalChange}
          placeholder="60"
          colors={colors}
          keyboardType="numbers-and-punctuation"
        />
      </FormField>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={[styles.switchLabel, { color: colors.foreground }]}>
            Overwrite existing times
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            When off, only unscheduled matches get new times.
          </Text>
        </View>
        <Switch
          value={overwrite}
          onValueChange={onOverwriteChange}
          accessibilityLabel="Overwrite existing times"
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.card}
        />
      </View>
      <FormSubmitButton
        label="Apply times"
        busy={busy}
        disabled={busy}
        onPress={onApply}
        colors={colors}
      />
    </View>
  );
}

function MatchListSection({
  colors,
  group,
  canSchedule,
  matchClocks,
  busyKey,
  onClockChange,
  onSave,
}: {
  colors: ReturnType<typeof useThemeColors>;
  group: TournamentHostScheduleGroupContract;
  canSchedule: boolean;
  matchClocks: Record<string, string>;
  busyKey: string | null;
  onClockChange: (matchId: string, clock: string) => void;
  onSave: (match: TournamentHostScheduleMatchContract) => void;
}) {
  const playable = group.matches.filter((match) => !match.isBye);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Matches ({group.scheduledCount}/{group.totalCount} scheduled)
      </Text>
      {playable.length === 0 ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          No playable matches in this group.
        </Text>
      ) : (
        playable.map((match) => {
          const busy = busyKey === `match-${match.id}`;
          const locked =
            match.status === "completed" || match.status === "in_progress";
          return (
            <View
              key={match.id}
              style={[styles.matchCard, { borderColor: colors.border }]}
            >
              <View style={styles.matchHeader}>
                <Text style={[styles.matchLabel, { color: colors.foreground }]}>
                  {match.label}
                </Text>
                <Text
                  style={[styles.matchStatus, { color: colors.mutedForeground }]}
                >
                  {MATCH_STATUS_LABELS[match.status] ?? match.status}
                </Text>
              </View>
              {match.groupName ? (
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  {match.groupName}
                </Text>
              ) : null}
              {match.courtName ? (
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  {match.courtName}
                </Text>
              ) : null}
              {match.scheduledTime ? (
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Scheduled {formatMatchTime(match.scheduledTime)}
                </Text>
              ) : null}
              {canSchedule && !locked ? (
                <View style={styles.matchEditRow}>
                  <View style={styles.matchClockField}>
                    <FormTextInput
                      value={matchClocks[match.id] ?? ""}
                      onChangeText={(value) => onClockChange(match.id, value)}
                      placeholder="HH:MM"
                      colors={colors}
                      autoCapitalize="none"
                    />
                  </View>
                  <FormSubmitButton
                    label="Save"
                    busy={busy}
                    disabled={busy}
                    onPress={() => onSave(match)}
                    colors={colors}
                  />
                </View>
              ) : locked ? (
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Locked while live or final.
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  hero: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  title: { fontSize: 20, fontWeight: "800" },
  meta: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  hint: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchCopy: { flex: 1, gap: 4 },
  switchLabel: { fontSize: 14, fontWeight: "600" },
  matchCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "flex-start",
  },
  matchLabel: { flex: 1, fontSize: 15, fontWeight: "700" },
  matchStatus: { fontSize: 12, fontWeight: "600" },
  matchEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  matchClockField: { flex: 1 },
});
