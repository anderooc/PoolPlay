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
  TournamentChatChannelContract,
  TournamentChatMessageContract,
} from "@/lib/api/contracts/tournament-ops";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  fetchTournamentChat,
  markTournamentChatRead,
  postTournamentChatMessage,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { usePolling } from "~/lib/use-polling";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

type ChatListItem =
  | { kind: "date"; key: string; label: string }
  | { kind: "message"; key: string; message: TournamentChatMessageContract };

function localDayKey(iso: string): string {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function chatDayLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return "Today";
  const today = new Date();
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1
  );
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, "0");
  const d = String(yesterday.getDate()).padStart(2, "0");
  if (dayKey === `${y}-${m}-${d}`) return "Yesterday";

  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1).toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: year === today.getFullYear() ? undefined : "numeric",
    }
  );
}

function buildChatListItems(
  messages: TournamentChatMessageContract[]
): ChatListItem[] {
  const todayKey = localDayKey(new Date().toISOString());
  const items: ChatListItem[] = [];
  let lastDay: string | null = null;

  for (const message of messages) {
    const day = localDayKey(message.createdAt);
    if (day !== lastDay) {
      items.push({
        kind: "date",
        key: `date-${day}`,
        label: chatDayLabel(day, todayKey),
      });
      lastDay = day;
    }
    items.push({ kind: "message", key: message.id, message });
  }

  return items;
}

export default function ChatScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [channelKind, setChannelKind] = useState<string | null>(null);
  const [teamSlug, setTeamSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentChat(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh, poll } = usePublicLoader(
    load,
    "Could not load chat."
  );

  usePolling(() => void poll(), 15_000, Boolean(data));

  useEffect(() => {
    if (!data) return;
    if (!channelKind && data.channels[0]) {
      setChannelKind(data.channels[0].kind);
    }
    if (!teamSlug && data.speakingTeams[0]) {
      setTeamSlug(data.speakingTeams[0].slug);
    }
  }, [data, channelKind, teamSlug]);

  useEffect(() => {
    if (!slug || !channelKind || !data) return;
    const channel = data.channels.find((item) => item.kind === channelKind);
    if (!channel || channel.unreadCount === 0) return;
    void markTournamentChatRead(slug, channelKind).catch(() => undefined);
  }, [slug, channelKind, data]);

  const channel: TournamentChatChannelContract | null = useMemo(() => {
    if (!data || !channelKind) return null;
    return data.channels.find((item) => item.kind === channelKind) ?? null;
  }, [data, channelKind]);

  const listItems = useMemo(
    () => buildChatListItems(channel?.messages ?? []),
    [channel?.messages]
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (data === null && error === null) return <LoadingScreen />;
  if (!data || !slug) {
    return (
      <ErrorScreen
        title="Chat unavailable"
        message={error ?? "Could not load chat."}
        onRetry={() => void refresh()}
      />
    );
  }

  async function onSend() {
    if (!channel || !draft.trim() || !data) return;
    const speakingTeams = data.speakingTeams;
    setBusy(true);
    setActionError(null);
    try {
      await postTournamentChatMessage(slug, {
        channelKind: channel.kind,
        body: draft,
        teamSlug: speakingTeams.length > 1 ? teamSlug ?? undefined : undefined,
      });
      setDraft("");
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Could not send message."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Chat</Text>
        <View style={styles.channels}>
          {data.channels.map((item) => {
            const selected = item.kind === channelKind;
            return (
              <Pressable
                key={item.kind}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setChannelKind(item.kind)}
                style={[
                  styles.channel,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected
                      ? withAlpha(colors.primary, 0.1)
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? colors.primary : colors.mutedForeground,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {item.label}
                  {item.unreadCount > 0 ? ` · ${item.unreadCount}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {channel ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {channel.description}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={listItems}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.messages}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            No messages in this channel yet.
          </Text>
        }
        renderItem={({ item }) => {
          if (item.kind === "date") {
            return (
              <View style={styles.dateRow}>
                <Text
                  style={[styles.dateLabel, { color: colors.mutedForeground }]}
                  accessibilityRole="header"
                >
                  {item.label}
                </Text>
              </View>
            );
          }

          const message = item.message;
          return (
            <View
              style={[
                styles.message,
                {
                  alignSelf: message.isOwn ? "flex-end" : "flex-start",
                  backgroundColor: message.isOwn
                    ? withAlpha(colors.primary, 0.12)
                    : colors.muted,
                },
              ]}
            >
              <Text style={[styles.author, { color: colors.mutedForeground }]}>
                {message.isOrganizerMessage
                  ? "Host"
                  : message.teamName
                    ? `${message.authorName} · ${message.teamName}`
                    : message.authorName}
              </Text>
              <Text style={[styles.body, { color: colors.foreground }]}>
                {message.body}
              </Text>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>
                {new Date(message.createdAt).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        }}
      />

      <View style={[styles.composer, { borderTopColor: colors.border }]}>
        {actionError ? (
          <Text style={{ color: colors.destructive, fontSize: 13 }}>
            {actionError}
          </Text>
        ) : null}
        {data.speakingTeams.length > 1 ? (
          <View style={styles.teams}>
            {data.speakingTeams.map((team) => {
              const selected = team.slug === teamSlug;
              return (
                <Pressable
                  key={team.slug}
                  onPress={() => setTeamSlug(team.slug)}
                  style={[
                    styles.teamChip,
                    {
                      borderColor: selected ? colors.secondary : colors.border,
                      backgroundColor: selected
                        ? withAlpha(colors.secondary, 0.1)
                        : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected
                        ? colors.secondary
                        : colors.mutedForeground,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {team.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {channel?.canPost ? (
          <View style={styles.composeRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy || !draft.trim()}
              onPress={() => void onSend()}
              style={[
                styles.send,
                {
                  backgroundColor: colors.primary,
                  opacity: busy || !draft.trim() ? 0.5 : 1,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={{ color: colors.primaryForeground, fontWeight: "700" }}
                >
                  Send
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            {data.canPost
              ? "You can read this channel, but only the host can post here."
              : "Chat is read-only for this tournament."}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, gap: 10 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  channels: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  channel: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  description: { fontSize: 13, lineHeight: 18 },
  messages: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  dateRow: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 2,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  message: {
    maxWidth: "88%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  author: { fontSize: 12, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 21 },
  time: { fontSize: 11 },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
  },
  teams: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  teamChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  composeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  send: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: "center",
  },
});
