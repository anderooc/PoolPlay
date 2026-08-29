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

import type { CreateOptionsContract } from "@/lib/api/contracts/create-options";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { createTeam, fetchCreateOptions } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  ChipPicker,
  FormField,
  FormSubmitButton,
  FormTextInput,
} from "~/components/create-form";
import {
  GENDER_LABELS,
  REGION_LABELS,
  TEAM_GENDER_VALUES,
  TEAM_REGION_VALUES,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { LoadingScreen } from "~/tournament/screen-state";
import { messageFor } from "~/tournament/use-public-loader";

const STANDALONE = "__standalone__";

export default function CreateTeamScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { schoolSlug: preselectedSchoolSlug } = useLocalSearchParams<{
    schoolSlug?: string;
  }>();
  const { session, isLoading: sessionLoading } = useSession();
  const [options, setOptions] = useState<CreateOptionsContract | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState(STANDALONE);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const next = await fetchCreateOptions(signal);
    setOptions(next);
    if (
      preselectedSchoolSlug &&
      next.manageableSchools.some(
        (school) => school.slug === preselectedSchoolSlug
      )
    ) {
      const match = next.manageableSchools.find(
        (school) => school.slug === preselectedSchoolSlug
      );
      if (match) setSelectedSchoolId(match.id);
    }
    setReady(true);
  }, [preselectedSchoolSlug]);

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

  const selectedSchool = useMemo(
    () =>
      selectedSchoolId === STANDALONE
        ? null
        : options?.manageableSchools.find(
            (school) => school.id === selectedSchoolId
          ) ?? null,
    [options, selectedSchoolId]
  );

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!ready) return <LoadingScreen />;

  async function onSubmit() {
    const teamGender = selectedSchool?.gender ?? gender;
    const teamRegion = selectedSchool?.region ?? region;
    if (!teamGender || !teamRegion) {
      setError("Select gender and region.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createTeam({
        name: name.trim(),
        gender: teamGender,
        region: teamRegion,
        schoolId: selectedSchool?.id ?? null,
      });
      router.replace(`/teams/${result.slug}`);
    } catch (cause) {
      setError(messageFor(cause, "Could not create team."));
    } finally {
      setBusy(false);
    }
  }

  const valid =
    name.trim().length > 0 &&
    (selectedSchool != null || (gender != null && region != null));

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        You&apos;ll be added as captain. School-linked teams inherit gender and
        region from the school.
      </Text>

      <FormField label="Part of a school" colors={colors}>
        {options?.manageableSchools.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            You&apos;re not a president or officer of any school yet. You can
            still create a standalone team if your profile has a university.
          </Text>
        ) : (
          <View style={styles.schoolList}>
            <SchoolOption
              label="None — standalone team"
              selected={selectedSchoolId === STANDALONE}
              onPress={() => setSelectedSchoolId(STANDALONE)}
              colors={colors}
            />
            {options?.manageableSchools.map((school) => (
              <SchoolOption
                key={school.id}
                label={school.name}
                selected={selectedSchoolId === school.id}
                onPress={() => setSelectedSchoolId(school.id)}
                colors={colors}
              />
            ))}
          </View>
        )}
      </FormField>

      <FormField label="Team name" colors={colors}>
        <FormTextInput
          value={name}
          onChangeText={setName}
          placeholder="Club Volleyball A"
          colors={colors}
        />
      </FormField>

      {selectedSchool ? (
        <View style={[styles.inherited, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            Gender & region
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            {GENDER_LABELS[selectedSchool.gender]} ·{" "}
            {REGION_LABELS[selectedSchool.region]}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Inherited from {selectedSchool.name}
          </Text>
        </View>
      ) : (
        <>
          <FormField label="Gender" colors={colors}>
            <ChipPicker
              options={TEAM_GENDER_VALUES}
              value={gender}
              onChange={setGender}
              colors={colors}
              labels={GENDER_LABELS}
            />
          </FormField>
          <FormField label="Region" colors={colors}>
            <ChipPicker
              options={TEAM_REGION_VALUES}
              value={region}
              onChange={setRegion}
              colors={colors}
              labels={REGION_LABELS}
            />
          </FormField>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Standalone teams are submitted for admin approval before they can
            register for tournaments.
          </Text>
        </>
      )}

      {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}

      <FormSubmitButton
        label="Create team"
        busy={busy}
        disabled={!valid}
        onPress={() => void onSubmit()}
        colors={colors}
      />
    </ScrollView>
  );
}

function SchoolOption({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.schoolOption,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected
            ? withAlpha(colors.primary, 0.08)
            : "transparent",
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.primary : colors.foreground,
          fontWeight: selected ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  lead: { fontSize: 15, lineHeight: 22 },
  schoolList: { gap: 8 },
  schoolOption: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inherited: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
});
