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

import type { DashboardContract } from "@/lib/api/contracts/dashboard";
import type { PersonalScheduleMatchContract } from "@/lib/api/contracts/personal-schedule";
import { Redirect, useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiClientError } from "~/api/client";
import { fetchDashboard, fetchNotifications, fetchPersonalSchedule } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  DASHBOARD_RELATION_LABELS,
  formatCalendarDate,
  GENDER_LABELS,
  REGION_LABELS,
  TEAM_ROLE_LABELS,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { useNotificationsRealtimeRevision } from "~/notifications/NotificationsRealtimeProvider";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { PersonalSchedulePanel } from "~/tournament/personal-schedule-panel";

export default function DashboardScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const [data, setData] = useState<DashboardContract | null>(null);
  const [scheduleMatches, setScheduleMatches] = useState<
    PersonalScheduleMatchContract[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const notificationsRevision = useNotificationsRealtimeRevision();

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const [page, schedule] = await Promise.all([
        fetchDashboard(signal),
        fetchPersonalSchedule(signal, { limit: 5 }),
      ]);
      setData(page);
      setScheduleMatches(schedule.matches);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Could not load your dashboard."
      );
    }
  }, []);

  const loadUnread = useCallback(async (signal?: AbortSignal) => {
    try {
      const inbox = await fetchNotifications({ limit: 1, signal });
      setUnreadNotifications(inbox.unreadCount);
    } catch {
      // Badge is best-effort.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      const controller = new AbortController();
      void loadUnread(controller.signal);
      return () => controller.abort();
    }, [session, loadUnread])
  );

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void loadUnread(controller.signal);
    return () => controller.abort();
  }, [notificationsRevision, session, loadUnread]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: session
        ? () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                unreadNotifications > 0
                  ? `Notifications, ${unreadNotifications} unread`
                  : "Notifications"
              }
              onPress={() => router.push("/notifications")}
              hitSlop={8}
              style={{ paddingHorizontal: 4, paddingVertical: 6 }}
            >
              <View style={{ position: "relative" }}>
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Inbox
                </Text>
                {unreadNotifications > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -10,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 999,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.destructive,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.card,
                        fontSize: 10,
                        fontWeight: "800",
                      }}
                    >
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )
        : undefined,
    });
  }, [colors, navigation, router, session, unreadNotifications]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [session, load]);

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (data === null && error === null) return <LoadingScreen />;
  if (data === null && error) {
    return (
      <ErrorScreen
        title="Couldn’t load dashboard"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  const isNewUser =
    data!.stats.teamCount === 0 &&
    data!.tournaments.length === 0 &&
    !data!.school;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={async () => {
            setIsRefreshing(true);
            await load();
            setIsRefreshing(false);
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.welcome}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Welcome back, {data!.firstName}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {data!.school
            ? `Your hub for ${data!.school.name} — teams, signups, and tournaments.`
            : "Your teams, signups, and tournaments."}
        </Text>
      </View>

      {isNewUser ? (
        <View style={[styles.getStarted, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Get started
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Join a school, pick up a team roster, or browse upcoming
            tournaments.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/schools/new")}
            style={[styles.linkRow, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Create a school
            </Text>
            <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/teams/new")}
            style={[styles.linkRow, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Create a team
            </Text>
            <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/schools")}
            style={[styles.linkRow, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Find a school
            </Text>
            <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/tournaments")}
            style={[styles.linkRow, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Browse tournaments
            </Text>
            <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/schedule")}
            style={[styles.linkRow, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Match schedule
            </Text>
            <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.stats}>
          <Stat
            label="Teams"
            value={data!.stats.teamCount}
            colors={colors}
          />
          <Stat
            label="Upcoming"
            value={data!.stats.upcomingCount}
            hint={
              data!.stats.pendingCount > 0
                ? `${data!.stats.pendingCount} pending`
                : undefined
            }
            colors={colors}
          />
          <Stat
            label="Past"
            value={data!.stats.pastCount}
            colors={colors}
          />
        </View>
      )}

      {!isNewUser ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/schedule")}
          style={[styles.linkRow, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            Match schedule
          </Text>
          <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
        </Pressable>
      ) : null}

      {!isNewUser && scheduleMatches.length > 0 ? (
        <Section
          title="Upcoming matches"
          actionLabel="View all"
          onAction={() => router.push("/my-schedule")}
          colors={colors}
        >
          <PersonalSchedulePanel matches={scheduleMatches} compact />
        </Section>
      ) : null}

      <Section
        title="My teams"
        actionLabel="All"
        onAction={() => router.push("/teams")}
        colors={colors}
      >
        {data!.school ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/schools/${data!.school!.slug}`)}
            style={[styles.schoolChip, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.mutedForeground, flex: 1 }}>
              School ·{" "}
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {data!.school.name}
              </Text>
            </Text>
            <Text style={{ color: colors.primary, fontSize: 18 }}>›</Text>
          </Pressable>
        ) : null}

        {data!.teams.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No teams yet.{" "}
            <Text
              style={{ color: colors.primary, fontWeight: "700" }}
              onPress={() => router.push("/teams/new")}
            >
              Create one
            </Text>{" "}
            to manage your roster.
          </Text>
        ) : (
          data!.teams.map((team) => (
            <Pressable
              key={team.slug}
              accessibilityRole="button"
              onPress={() => router.push(`/teams/${team.slug}`)}
              style={[styles.row, { borderColor: colors.border }]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                  {team.name}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {team.university}
                  {team.jerseyNumber != null ? ` · #${team.jerseyNumber}` : ""}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {TEAM_ROLE_LABELS[team.role] ?? team.role}
                  {" · "}
                  {GENDER_LABELS[team.gender] ?? team.gender}
                  {" · "}
                  {REGION_LABELS[team.region] ?? team.region}
                </Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
            </Pressable>
          ))
        )}
      </Section>

      <Section
        title="My tournaments"
        actionLabel="Browse"
        onAction={() => router.push("/tournaments")}
        colors={colors}
      >
        {data!.tournaments.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Tournaments you host or sign up for will show up here.
          </Text>
        ) : (
          data!.tournaments.map((tournament) => {
            const meta = [
              formatCalendarDate(tournament.date),
              tournament.location,
              tournament.teamName,
              tournament.divisionName,
            ].filter(Boolean);

            return (
              <Pressable
                key={tournament.slug}
                accessibilityRole="button"
                onPress={() =>
                  router.push(`/tournament/${tournament.slug}`)
                }
                style={[styles.row, { borderColor: colors.border }]}
              >
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowTitle, { color: colors.foreground }]}
                  >
                    {tournament.name}
                  </Text>
                  <Text
                    style={[styles.meta, { color: colors.mutedForeground }]}
                  >
                    {meta.join(" · ")}
                  </Text>
                  <Text
                    style={[
                      styles.relation,
                      {
                        color: colors.primary,
                        backgroundColor: withAlpha(colors.primary, 0.08),
                      },
                    ]}
                  >
                    {DASHBOARD_RELATION_LABELS[tournament.relation] ??
                      tournament.relation}
                  </Text>
                </View>
                <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
              </Pressable>
            );
          })
        )}
      </Section>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  hint,
  colors,
}: {
  label: string;
  value: number;
  hint?: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={[
        styles.stat,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.statHint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function Section({
  title,
  actionLabel,
  onAction,
  colors,
  children,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  colors: ReturnType<typeof useThemeColors>;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            {actionLabel}
          </Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  welcome: { gap: 6 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  getStarted: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  hint: { fontSize: 14, lineHeight: 20 },
  linkRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  statLabel: { fontSize: 12, fontWeight: "600" },
  statValue: { fontSize: 24, fontWeight: "800" },
  statHint: { fontSize: 11, lineHeight: 14 },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  schoolChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  empty: { fontSize: 14, lineHeight: 20 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13, lineHeight: 18 },
  relation: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
  },
});
