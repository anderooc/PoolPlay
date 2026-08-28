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

import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiClientError } from "~/api/client";
import { fetchViewer, updateProfile } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  USER_PLAYER_GENDERS,
  USER_PLAYER_GENDER_LABELS,
  VOLLEYBALL_POSITIONS,
  VOLLEYBALL_POSITION_LABELS,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { LoadingScreen } from "~/tournament/screen-state";
import { messageFor } from "~/tournament/use-public-loader";

export default function EditProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [playerGender, setPlayerGender] = useState<string | null>(null);
  const [volleyballPosition, setVolleyballPosition] = useState<string | null>(
    null
  );
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [displayEmail, setDisplayEmail] = useState<string | null>(null);
  const [displaySchool, setDisplaySchool] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const viewer = await fetchViewer(signal);
    setFullName(viewer.fullName);
    setPlayerGender(viewer.playerGender);
    setVolleyballPosition(viewer.volleyballPosition);
    setJerseyNumber(
      viewer.jerseyNumber == null ? "" : String(viewer.jerseyNumber)
    );
    setDisplayEmail(viewer.displayEmail ?? viewer.email);
    setDisplaySchool(viewer.displaySchool ?? viewer.university);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void load(controller.signal).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Could not load your profile."
      );
    });
    return () => controller.abort();
  }, [session, load]);

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!ready && !error) return <LoadingScreen />;

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        playerGender,
        volleyballPosition,
        jerseyNumber: jerseyNumber.trim() === "" ? null : jerseyNumber.trim(),
      });
      router.back();
    } catch (cause) {
      setError(messageFor(cause, "Could not save profile."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.readOnly, { borderColor: colors.border }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Email</Text>
        <Text style={{ color: colors.foreground, fontWeight: "600" }}>
          {displayEmail ?? "—"}
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 13,
            marginTop: 8,
          }}
        >
          School
        </Text>
        <Text style={{ color: colors.foreground, fontWeight: "600" }}>
          {displaySchool ?? "—"}
        </Text>
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>
        Display name
      </Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Your name"
        placeholderTextColor={colors.mutedForeground}
        autoComplete="name"
        maxLength={120}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />

      <Text style={[styles.label, { color: colors.foreground }]}>Gender</Text>
      <View style={styles.chips}>
        <Pressable
          onPress={() => setPlayerGender(null)}
          style={chipStyle(playerGender === null, colors)}
        >
          <Text style={chipTextStyle(playerGender === null, colors)}>
            Not set
          </Text>
        </Pressable>
        {USER_PLAYER_GENDERS.map((value) => {
          const selected = playerGender === value;
          return (
            <Pressable
              key={value}
              onPress={() => setPlayerGender(value)}
              style={chipStyle(selected, colors)}
            >
              <Text style={chipTextStyle(selected, colors)}>
                {USER_PLAYER_GENDER_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>
        Volleyball position
      </Text>
      <View style={styles.chips}>
        <Pressable
          onPress={() => setVolleyballPosition(null)}
          style={chipStyle(volleyballPosition === null, colors)}
        >
          <Text style={chipTextStyle(volleyballPosition === null, colors)}>
            Not set
          </Text>
        </Pressable>
        {VOLLEYBALL_POSITIONS.map((value) => {
          const selected = volleyballPosition === value;
          return (
            <Pressable
              key={value}
              onPress={() => setVolleyballPosition(value)}
              style={chipStyle(selected, colors)}
            >
              <Text style={chipTextStyle(selected, colors)}>
                {VOLLEYBALL_POSITION_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>
        Jersey number
      </Text>
      <TextInput
        value={jerseyNumber}
        onChangeText={setJerseyNumber}
        placeholder="e.g. 7"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="number-pad"
        maxLength={2}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        0–99. Used on every team and school roster you join.
      </Text>

      {error ? (
        <Text style={{ color: colors.destructive }}>{error}</Text>
      ) : null}

      <Pressable
        disabled={busy || !fullName.trim()}
        onPress={() => void onSave()}
        style={[
          styles.save,
          {
            backgroundColor: colors.primary,
            opacity: busy || !fullName.trim() ? 0.5 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
            Save profile
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function chipStyle(
  selected: boolean,
  colors: ReturnType<typeof useThemeColors>
) {
  return [
    styles.chip,
    {
      borderColor: selected ? colors.primary : colors.border,
      backgroundColor: selected ? withAlpha(colors.primary, 0.1) : "transparent",
    },
  ];
}

function chipTextStyle(
  selected: boolean,
  colors: ReturnType<typeof useThemeColors>
) {
  return {
    color: selected ? colors.primary : colors.mutedForeground,
    fontWeight: "700" as const,
    fontSize: 13,
  };
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  readOnly: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 2,
    marginBottom: 6,
  },
  label: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hint: { fontSize: 13, lineHeight: 18 },
  save: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
