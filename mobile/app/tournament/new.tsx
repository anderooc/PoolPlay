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
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { createTournament, fetchCreateOptions } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  ChipPicker,
  FormField,
  FormSubmitButton,
  FormTextInput,
} from "~/components/create-form";
import {
  GENDER_LABELS,
  PLAY_FORMAT_DESCRIPTIONS,
  PLAY_FORMAT_LABELS,
  PLAY_FORMAT_VALUES,
  REGION_LABELS,
  todayISO,
} from "~/lib/format";
import { useThemeColors } from "~/theme/colors";
import { LoadingScreen } from "~/tournament/screen-state";
import { messageFor } from "~/tournament/use-public-loader";

export default function CreateTournamentScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const [ready, setReady] = useState(false);
  const [hostSchool, setHostSchool] = useState<
    Awaited<ReturnType<typeof fetchCreateOptions>>["hostingSchool"]
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [playFormat, setPlayFormat] = useState<string>("pool_to_bracket");
  const [date, setDate] = useState(todayISO);
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    const options = await fetchCreateOptions(signal);
    setHostSchool(options.hostingSchool);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void load(controller.signal).catch((cause) => {
      if (controller.signal.aborted) return;
      setError(messageFor(cause, "Could not load create options."));
      setReady(true);
    });
    return () => controller.abort();
  }, [session, load]);

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!ready) return <LoadingScreen />;

  async function onSubmit() {
    if (!hostSchool) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createTournament({
        hostSchoolId: hostSchool.id,
        name: name.trim(),
        description: description.trim() || undefined,
        date: date.trim(),
        location: location.trim(),
        address: address.trim() || undefined,
        playFormat,
      });
      router.replace(`/tournament/${result.slug}`);
    } catch (cause) {
      setError(messageFor(cause, "Could not create tournament."));
    } finally {
      setBusy(false);
    }
  }

  if (!hostSchool) {
    return (
      <View style={[styles.blocked, { backgroundColor: colors.background }]}>
        <Text style={[styles.blockedTitle, { color: colors.foreground }]}>
          Join or create a school first
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          Tournaments are hosted by a school. You need to be a school president
          or officer, then return here to host an event.
        </Text>
        <Pressable
          onPress={() => router.push("/schools/new")}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
            Create school
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/schools")}
          style={[styles.cta, { borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            Browse schools
          </Text>
        </Pressable>
      </View>
    );
  }

  const valid =
    name.trim().length > 0 &&
    date.trim().length > 0 &&
    location.trim().length > 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.hostCard, { borderColor: colors.border }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          Hosting school
        </Text>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 17 }}>
          {hostSchool.name}
        </Text>
        <Text style={{ color: colors.mutedForeground }}>{hostSchool.university}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          {GENDER_LABELS[hostSchool.gender]} · {REGION_LABELS[hostSchool.region]}
        </Text>
      </View>

      <FormField label="Tournament name" colors={colors}>
        <FormTextInput
          value={name}
          onChangeText={setName}
          placeholder="Spring Invitational 2026"
          colors={colors}
        />
      </FormField>

      <FormField label="Description (optional)" colors={colors}>
        <FormTextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Start time, fees, format, and other details…"
          colors={colors}
          multiline
        />
      </FormField>

      <FormField
        label="Tournament format"
        hint={PLAY_FORMAT_DESCRIPTIONS[playFormat]}
        colors={colors}
      >
        <ChipPicker
          options={PLAY_FORMAT_VALUES}
          value={playFormat}
          onChange={setPlayFormat}
          colors={colors}
          labels={PLAY_FORMAT_LABELS}
        />
      </FormField>

      <FormField
        label="Date"
        hint="Use YYYY-MM-DD format."
        colors={colors}
      >
        <FormTextInput
          value={date}
          onChangeText={setDate}
          placeholder="2026-03-15"
          colors={colors}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
        />
      </FormField>

      <FormField label="Location" colors={colors}>
        <FormTextInput
          value={location}
          onChangeText={setLocation}
          placeholder="University Gym"
          colors={colors}
        />
      </FormField>

      <FormField label="Address (optional)" colors={colors}>
        <FormTextInput
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St, City, ST 12345"
          colors={colors}
        />
      </FormField>

      {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}

      <FormSubmitButton
        label="Create tournament"
        busy={busy}
        disabled={!valid}
        onPress={() => void onSubmit()}
        colors={colors}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  hostCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  blocked: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  blockedTitle: { fontSize: 20, fontWeight: "700" },
  cta: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 200,
    alignItems: "center",
  },
});
