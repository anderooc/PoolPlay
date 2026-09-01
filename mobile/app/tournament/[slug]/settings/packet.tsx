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

import type { TournamentPacketHostContract } from "@/lib/api/contracts/tournament-host";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  fetchTournamentHostPacket,
  updateTournamentHostPacket,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { FormField, FormTextInput } from "~/components/create-form";
import { useThemeColors } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

const DEFAULT_COLOR = "#C93D2E";
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export default function PacketSettingsScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [colorInput, setColorInput] = useState(DEFAULT_COLOR);
  const [savedColor, setSavedColor] = useState(DEFAULT_COLOR);
  const [canEdit, setCanEdit] = useState(true);
  const [lockedReason, setLockedReason] = useState<string | null>(null);
  const [notesBusy, setNotesBusy] = useState(false);
  const [colorBusy, setColorBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);
  const [colorSaved, setColorSaved] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentHostPacket(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load packet settings."
  );

  useEffect(() => {
    if (!data) return;
    applyPacket(data);
  }, [data]);

  function applyPacket(packet: TournamentPacketHostContract) {
    const nextNotes = packet.notes ?? "";
    const nextColor = packet.accentColor ?? DEFAULT_COLOR;
    setNotes(nextNotes);
    setSavedNotes(nextNotes);
    setColorInput(nextColor);
    setSavedColor(nextColor);
    setCanEdit(packet.canEdit);
    setLockedReason(packet.lockedReason);
  }

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
  if (data === null && error === null) {
    return <LoadingScreen />;
  }
  if (!data) {
    return (
      <ErrorScreen
        title="Packet settings unavailable"
        message={error ?? "Only the tournament host can edit these settings."}
        onRetry={() => void refresh()}
      />
    );
  }

  async function onSaveNotes() {
    if (!canEdit || notesBusy) return;
    setNotesBusy(true);
    setActionError(null);
    setNotesSaved(false);
    try {
      const next = await updateTournamentHostPacket(slug!, { notes });
      applyPacket(next);
      setNotesSaved(true);
    } catch (cause) {
      setActionError(messageFor(cause, "Could not save packet notes."));
    } finally {
      setNotesBusy(false);
    }
  }

  async function onSaveColor() {
    if (!canEdit || colorBusy) return;
    const trimmed = colorInput.trim();
    if (!HEX_RE.test(trimmed)) {
      setActionError("Enter a 6-digit hex color, e.g. #1A3F7D");
      return;
    }
    setColorBusy(true);
    setActionError(null);
    setColorSaved(false);
    try {
      const next = await updateTournamentHostPacket(slug!, {
        accentColor: trimmed,
      });
      applyPacket(next);
      setColorSaved(true);
    } catch (cause) {
      setActionError(messageFor(cause, "Could not save header color."));
    } finally {
      setColorBusy(false);
    }
  }

  const notesDirty = notes !== savedNotes;
  const colorDirty = colorInput !== savedColor;

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
          Tournament packet
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Logistics notes and PDF header color for the downloadable team packet.
        </Text>

        {lockedReason ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {lockedReason}
          </Text>
        ) : null}

        <FormField label="Logistics & day-of notes" colors={colors}>
          <FormTextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            editable={canEdit && !notesBusy}
            placeholder="Agenda, parking, food, check-in, contacts…"
            colors={colors}
            style={{ minHeight: 180, textAlignVertical: "top" }}
          />
        </FormField>

        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            disabled={notesBusy || !notesDirty}
            onPress={() => void onSaveNotes()}
            style={[
              styles.inlineSave,
              {
                borderColor: colors.border,
                opacity: notesBusy || !notesDirty ? 0.5 : 1,
              },
            ]}
          >
            {notesBusy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                Save packet notes
              </Text>
            )}
          </Pressable>
        ) : null}
        {notesSaved ? (
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Notes saved.
          </Text>
        ) : null}

        <FormField
          label="PDF header color"
          hint="Hex color for the packet PDF header band."
          colors={colors}
        >
          <FormTextInput
            value={colorInput}
            onChangeText={setColorInput}
            autoCapitalize="none"
            editable={canEdit && !colorBusy}
            placeholder="#C93D2E"
            colors={colors}
          />
        </FormField>

        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            disabled={colorBusy || !colorDirty}
            onPress={() => void onSaveColor()}
            style={[
              styles.inlineSave,
              {
                borderColor: colors.border,
                opacity: colorBusy || !colorDirty ? 0.5 : 1,
              },
            ]}
          >
            {colorBusy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                Save header color
              </Text>
            )}
          </Pressable>
        ) : null}
        {colorSaved ? (
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Color saved.
          </Text>
        ) : null}

        {actionError ? (
          <Text style={{ color: colors.destructive }}>{actionError}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 21 },
  hint: { fontSize: 13, lineHeight: 18 },
  inlineSave: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
