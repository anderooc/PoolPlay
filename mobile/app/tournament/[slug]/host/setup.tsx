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

import type { TournamentHostSetupContract } from "@/lib/api/contracts/tournament-host";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addTournamentHostCourt,
  addTournamentHostDivision,
  fetchTournamentHostSetup,
  removeTournamentHostCourt,
  removeTournamentHostDivision,
  setTournamentHostDivisionCourts,
  updateTournamentHostRegistrationAvailability,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  FormField,
  FormSubmitButton,
  FormTextInput,
} from "~/components/create-form";
import { PLAY_FORMAT_LABELS } from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function TournamentHostSetupScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [setup, setSetup] = useState<TournamentHostSetupContract | null>(null);
  const [divisionName, setDivisionName] = useState("");
  const [courtName, setCourtName] = useState("");
  const [capacityText, setCapacityText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentHostSetup(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load setup."
  );

  useEffect(() => {
    if (!data) return;
    setSetup(data.setup);
    setCapacityText(
      data.setup.registrationCapacity == null
        ? ""
        : String(data.setup.registrationCapacity)
    );
    setDeadline(data.setup.registrationDeadline ?? "");
  }, [data]);

  const runAction = useCallback(
    async (action: () => Promise<{ setup: TournamentHostSetupContract }>) => {
      setBusy(true);
      setActionError(null);
      try {
        const result = await action();
        setSetup(result.setup);
      } catch (cause) {
        setActionError(messageFor(cause, "Could not save changes."));
      } finally {
        setBusy(false);
      }
    },
    []
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
  if (error && !setup) {
    return (
      <ErrorScreen
        title="Setup unavailable"
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!setup) return <LoadingScreen />;

  const locked = !setup.canEdit;

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
      {setup.preparationLockedReason ? (
        <Text style={[styles.locked, { color: colors.mutedForeground }]}>
          {setup.preparationLockedReason}
        </Text>
      ) : null}
      {actionError ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {actionError}
        </Text>
      ) : null}

      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          Format
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {PLAY_FORMAT_LABELS[setup.playFormat] ?? setup.playFormat}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Chosen at creation and shared by every pool.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Registration availability
        </Text>
        <FormField label="Capacity" colors={colors} hint="Leave blank for unlimited.">
          <FormTextInput
            value={capacityText}
            onChangeText={setCapacityText}
            placeholder="Unlimited"
            colors={colors}
            keyboardType="numbers-and-punctuation"
          />
        </FormField>
        <FormField label="Deadline" colors={colors} hint="YYYY-MM-DD or leave blank.">
          <FormTextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="No deadline"
            colors={colors}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
        </FormField>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {setup.registeredCount} active registrations
        </Text>
        <FormSubmitButton
          label="Save availability"
          busy={busy}
          disabled={locked}
          colors={colors}
          onPress={() =>
            void runAction(() =>
              updateTournamentHostRegistrationAvailability(slug, {
                capacity:
                  capacityText.trim() === ""
                    ? null
                    : Number.parseInt(capacityText, 10),
                deadline: deadline.trim() === "" ? null : deadline.trim(),
              })
            )
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Pools
        </Text>
        {setup.divisions.map((division) => (
          <View
            key={division.id}
            style={[styles.itemCard, { borderColor: colors.border }]}
          >
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>
                {division.name}
              </Text>
              {!locked ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${division.name}`}
                  onPress={() =>
                    Alert.alert(
                      "Remove pool?",
                      `Delete ${division.name}? This cannot be undone.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () =>
                            void runAction(() =>
                              removeTournamentHostDivision(slug, division.id)
                            ),
                        },
                      ]
                    )
                  }
                >
                  <Text style={{ color: colors.destructive, fontWeight: "600" }}>
                    Remove
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {setup.courts.length > 0 ? (
              <View style={styles.courtPickers}>
                <Text
                  style={[styles.meta, { color: colors.mutedForeground }]}
                >
                  Courts
                </Text>
                {setup.courts.map((court) => {
                  const selected = division.courtIds.includes(court.id);
                  return (
                    <Pressable
                      key={court.id}
                      disabled={locked || busy}
                      onPress={() => {
                        const next = selected
                          ? division.courtIds.filter((id) => id !== court.id)
                          : [...division.courtIds, court.id];
                        void runAction(() =>
                          setTournamentHostDivisionCourts(
                            slug,
                            division.id,
                            next
                          )
                        );
                      }}
                      style={[
                        styles.courtChip,
                        {
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                          backgroundColor: selected
                            ? withAlpha(colors.primary, 0.1)
                            : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected
                            ? colors.primary
                            : colors.foreground,
                          fontWeight: selected ? "700" : "500",
                        }}
                      >
                        {court.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                Add courts below to assign them to this pool.
              </Text>
            )}
          </View>
        ))}
        {!locked ? (
          <>
            <FormField label="New pool name" colors={colors}>
              <FormTextInput
                value={divisionName}
                onChangeText={setDivisionName}
                placeholder="Gold"
                colors={colors}
              />
            </FormField>
            <FormSubmitButton
              label="Add pool"
              busy={busy}
              disabled={!divisionName.trim()}
              colors={colors}
              onPress={() => {
                const name = divisionName.trim();
                if (!name) return;
                void runAction(async () => {
                  const result = await addTournamentHostDivision(slug, name);
                  setDivisionName("");
                  return result;
                });
              }}
            />
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Courts
        </Text>
        {setup.courts.map((court) => (
          <View
            key={court.id}
            style={[styles.itemCard, { borderColor: colors.border }]}
          >
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>
                {court.name}
              </Text>
              {!locked ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${court.name}`}
                  onPress={() =>
                    Alert.alert(
                      "Remove court?",
                      `Delete ${court.name}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () =>
                            void runAction(() =>
                              removeTournamentHostCourt(slug, court.id)
                            ),
                        },
                      ]
                    )
                  }
                >
                  <Text style={{ color: colors.destructive, fontWeight: "600" }}>
                    Remove
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
        {!locked ? (
          <>
            <FormField label="New court name" colors={colors}>
              <FormTextInput
                value={courtName}
                onChangeText={setCourtName}
                placeholder="Court 1"
                colors={colors}
              />
            </FormField>
            <FormSubmitButton
              label="Add court"
              busy={busy}
              disabled={!courtName.trim()}
              colors={colors}
              onPress={() => {
                const name = courtName.trim();
                if (!name) return;
                void runAction(async () => {
                  const result = await addTournamentHostCourt(slug, name);
                  setCourtName("");
                  return result;
                });
              }}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  locked: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13, lineHeight: 18 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  courtPickers: { gap: 8 },
  courtChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
