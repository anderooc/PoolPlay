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
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  fetchTournamentHostOverview,
  updateTournamentHostStatus,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { ChipPicker } from "~/components/create-form";
import {
  PLAY_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_STATUS_VALUES,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function TournamentHostScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [statusBusy, setStatusBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentHostOverview(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh, reload } = usePublicLoader(
    load,
    "Could not load host tools."
  );

  const onStatusChange = useCallback(
    async (status: string) => {
      if (!slug || !data || data.overview.status === status) return;
      setStatusBusy(true);
      setActionError(null);
      try {
        await updateTournamentHostStatus(slug, status);
        await reload(undefined, "silent");
      } catch (cause) {
        setActionError(messageFor(cause, "Could not update status."));
      } finally {
        setStatusBusy(false);
      }
    },
    [data, reload, slug]
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!slug) {
    return (
      <ErrorScreen
        title="Missing tournament"
        message="No tournament was specified."
        onRetry={() => router.replace("/")}
      />
    );
  }
  if (error && !data) {
    return (
      <ErrorScreen
        title="Host tools unavailable"
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!data) return <LoadingScreen />;

  const overview = data.overview;

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
          {overview.name}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {TOURNAMENT_STATUS_LABELS[overview.status] ?? overview.status}
          {" · "}
          {PLAY_FORMAT_LABELS[overview.playFormat] ?? overview.playFormat}
        </Text>
        {overview.isArchived ? (
          <Text style={[styles.warning, { color: colors.destructive }]}>
            Archived — update the date before changing status.
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Status
        </Text>
        <ChipPicker
          options={TOURNAMENT_STATUS_VALUES}
          value={overview.status}
          onChange={(value) => void onStatusChange(value)}
          colors={colors}
          labels={TOURNAMENT_STATUS_LABELS}
        />
        {statusBusy ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Saving…
          </Text>
        ) : null}
        {actionError ? (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {actionError}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Checklist
        </Text>
        {overview.checklist.map((step) => (
          <View
            key={step.id}
            style={[
              styles.checkItem,
              {
                borderColor: colors.border,
                backgroundColor: step.done
                  ? withAlpha(colors.primary, 0.06)
                  : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.checkMark,
                { color: step.done ? colors.primary : colors.mutedForeground },
              ]}
            >
              {step.done ? "✓" : "○"}
            </Text>
            <View style={styles.checkText}>
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                {step.label}
              </Text>
              {!step.done && step.hint ? (
                <Text
                  style={[styles.hint, { color: colors.mutedForeground }]}
                >
                  {step.hint}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Manage
        </Text>
        <HostLink
          title="Setup"
          detail={`${overview.counts.divisionCount} pools · ${overview.counts.courtCount} courts`}
          onPress={() => router.push(`/tournament/${slug}/host/setup`)}
          colors={colors}
        />
        {overview.sections.poolSettings ? (
          <HostLink
            title="Pool settings"
            detail="Match format, scoring, tie-breaks"
            onPress={() => router.push(`/tournament/${slug}/settings/pool`)}
            colors={colors}
          />
        ) : null}
        {overview.sections.bracketSettings ? (
          <HostLink
            title="Bracket settings"
            detail="Gold / silver / bronze structure"
            onPress={() => router.push(`/tournament/${slug}/settings/bracket`)}
            colors={colors}
          />
        ) : null}
        {overview.sections.pools ? (
          <HostLink
            title="Pool ops"
            detail="Seeding, matches, and release"
            onPress={() => router.push(`/tournament/${slug}/host/pools`)}
            colors={colors}
          />
        ) : null}
        {overview.sections.bracket ? (
          <HostLink
            title="Bracket ops"
            detail="Tier settings and regenerate"
            onPress={() => router.push(`/tournament/${slug}/host/bracket`)}
            colors={colors}
          />
        ) : null}
        {overview.sections.schedule ? (
          <HostLink
            title="Schedule"
            detail="Set start times and bulk fill"
            onPress={() => router.push(`/tournament/${slug}/host/schedule`)}
            colors={colors}
          />
        ) : null}
        <HostLink
          title="Matches"
          detail="Public schedule and scoring"
          onPress={() => router.push(`/tournament/${slug}?tab=matches`)}
          colors={colors}
        />
        {overview.canCheckIn ? (
          <HostLink
            title="Check-in"
            detail={`${overview.counts.checkedInCount} of ${overview.counts.confirmedCount + overview.counts.checkedInCount} teams checked in`}
            onPress={() =>
              router.push(`/tournament/${slug}/host/registrations?tab=checkin`)
            }
            colors={colors}
          />
        ) : null}
        <HostLink
          title="Registrations"
          detail={
            overview.canCheckIn
              ? `${overview.counts.registrationCount} teams`
              : `${overview.counts.registrationCount} teams · ${overview.counts.pendingCount} pending`
          }
          onPress={() => router.push(`/tournament/${slug}/host/registrations`)}
          colors={colors}
        />
      </View>
    </ScrollView>
  );
}

function HostLink({
  title,
  detail,
  onPress,
  colors,
  disabled,
  badge,
}: {
  title: string;
  detail: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.link,
        {
          borderColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.linkText}>
        <View style={styles.linkTitleRow}>
          <Text style={[styles.linkTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          {badge ? (
            <Text style={[styles.badge, { color: colors.mutedForeground }]}>
              {badge}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.linkDetail, { color: colors.mutedForeground }]}>
          {detail}
        </Text>
      </View>
      {!disabled ? (
        <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
      ) : null}
    </Pressable>
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
  title: { fontSize: 22, fontWeight: "800" },
  meta: { fontSize: 14 },
  warning: { fontSize: 13, marginTop: 4 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  hint: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13 },
  checkItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  checkMark: { fontSize: 16, fontWeight: "700", width: 18 },
  checkText: { flex: 1, gap: 4 },
  checkLabel: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  link: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkText: { flex: 1, gap: 2 },
  linkTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  linkTitle: { fontSize: 15, fontWeight: "700" },
  badge: { fontSize: 12, fontWeight: "600" },
  linkDetail: { fontSize: 13, lineHeight: 18 },
  chevron: { fontSize: 22, fontWeight: "300" },
});
