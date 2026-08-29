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

import type { NotificationItemContract } from "@/lib/api/contracts/notifications";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchNotifications, markNotificationsRead } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { FormSubmitButton } from "~/components/create-form";
import { formatRelativeTime } from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";
import { useNotificationsRealtimeRevision } from "~/notifications/NotificationsRealtimeProvider";

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const [items, setItems] = useState<NotificationItemContract[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchNotifications({ limit: 80, signal }),
    []
  );
  const { data, error, isRefreshing, refresh, reload } = usePublicLoader(
    load,
    "Could not load notifications."
  );
  const notificationsRevision = useNotificationsRealtimeRevision();

  useEffect(() => {
    if (!session) return;
    void reload(undefined, "silent");
  }, [notificationsRevision, reload, session]);

  useEffect(() => {
    if (!data) return;
    setItems(data.notifications);
    setUnreadCount(data.unreadCount);
  }, [data]);

  const notifications = items ?? data?.notifications ?? null;
  const unread = items
    ? items.filter((row) => !row.readAt).length
    : (data?.unreadCount ?? unreadCount);

  const markOne = useCallback(
    async (item: NotificationItemContract) => {
      if (item.readAt) return;
      const readAt = new Date().toISOString();
      setItems((prev) =>
        (prev ?? []).map((row) =>
          row.id === item.id ? { ...row, readAt } : row
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        const result = await markNotificationsRead([item.id]);
        setUnreadCount(result.unreadCount);
      } catch {
        // Best-effort; inbox will refresh on next load.
      }
    },
    []
  );

  const markAll = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    const readAt = new Date().toISOString();
    setItems((prev) =>
      (prev ?? []).map((row) => ({ ...row, readAt: row.readAt ?? readAt }))
    );
    setUnreadCount(0);
    try {
      const result = await markNotificationsRead();
      setUnreadCount(result.unreadCount);
    } catch (cause) {
      setActionError(messageFor(cause, "Could not mark notifications read."));
      void refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const openItem = useCallback(
    (item: NotificationItemContract) => {
      void markOne(item);
      if (item.mobileHref) {
        router.push(item.mobileHref as never);
      }
    },
    [markOne, router]
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (error && !notifications) {
    return (
      <ErrorScreen
        title="Notifications unavailable"
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!notifications) return <LoadingScreen />;

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
            setItems(null);
            void refresh();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.hero, { borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Inbox
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {unread > 0
            ? `${unread} unread notification${unread === 1 ? "" : "s"}`
            : "You're all caught up"}
        </Text>
      </View>

      {actionError ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {actionError}
        </Text>
      ) : null}

      {unread > 0 ? (
        <FormSubmitButton
          label="Mark all as read"
          busy={busy}
          disabled={busy}
          onPress={() => void markAll()}
          colors={colors}
        />
      ) : null}

      {notifications.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          No notifications yet. Tournament updates, host messages, registration
          changes, and school join requests will appear here.
        </Text>
      ) : (
        <View style={styles.list}>
          {notifications.map((item) => {
            const isUnread = !item.readAt;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => openItem(item)}
                style={[
                  styles.card,
                  {
                    borderColor: colors.border,
                    backgroundColor: isUnread
                      ? withAlpha(colors.primary, 0.06)
                      : "transparent",
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  {isUnread ? (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  ) : (
                    <View style={styles.dotSpacer} />
                  )}
                  <Text
                    style={[styles.kind, { color: colors.mutedForeground }]}
                  >
                    {item.kindLabel}
                    {item.createdAt
                      ? ` · ${formatRelativeTime(item.createdAt)}`
                      : ""}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.itemTitle,
                    {
                      color: colors.foreground,
                      fontWeight: isUnread ? "800" : "700",
                    },
                  ]}
                >
                  {item.title}
                </Text>
                {item.body ? (
                  <Text style={[styles.body, { color: colors.mutedForeground }]}>
                    {item.body}
                  </Text>
                ) : null}
                {item.mobileHref ? (
                  <Text style={[styles.link, { color: colors.primary }]}>
                    Open →
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  hero: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  title: { fontSize: 22, fontWeight: "800" },
  meta: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13 },
  empty: { fontSize: 14, lineHeight: 22 },
  list: { gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  dotSpacer: { width: 8, height: 8 },
  kind: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flex: 1,
  },
  itemTitle: { fontSize: 15, lineHeight: 21 },
  body: { fontSize: 14, lineHeight: 20 },
  link: { fontSize: 13, fontWeight: "700", marginTop: 2 },
});
