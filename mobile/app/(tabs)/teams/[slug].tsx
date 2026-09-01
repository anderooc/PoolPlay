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

import type { TeamDetailContract } from "@/lib/api/contracts/team";
import {
  Redirect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
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
  addTeamMember,
  deleteTeam,
  fetchTeam,
  removeTeamMember,
  updateTeamMemberJersey,
  updateTeamMemberPosition,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  GENDER_LABELS,
  REGION_LABELS,
  SCHOOL_ROLE_LABELS,
  TEAM_ROLE_LABELS,
  TEAM_VERIFICATION_LABELS,
  VOLLEYBALL_POSITION_LABELS,
} from "~/lib/format";
import { VolleyballPositionChips } from "~/roster/volleyball-position-chips";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function TeamDetailScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addJersey, setAddJersey] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateJerseys, setCandidateJerseys] = useState<
    Record<string, string>
  >({});
  const [jerseyDrafts, setJerseyDrafts] = useState<Record<string, string>>({});
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const load = useCallback(
    (signal?: AbortSignal) => fetchTeam(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh, reload } = usePublicLoader(
    load,
    "Could not load this team."
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: data?.name ?? "Team",
    });
  }, [data?.name, navigation]);

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!slug) {
    return (
      <ErrorScreen
        title="Team unavailable"
        message="Missing team link."
        onRetry={() => {}}
      />
    );
  }
  if (data === null && error === null) return <LoadingScreen />;
  if (!data) {
    return (
      <ErrorScreen
        title="Team unavailable"
        message={error ?? "Could not load this team."}
        onRetry={() => void reload()}
      />
    );
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(membershipId: string, name: string) {
    Alert.alert("Remove player", `Remove ${name} from this team?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          void runAction(async () => {
            await removeTeamMember(slug!, membershipId);
          }),
      },
    ]);
  }

  function jerseyValue(membershipId: string, current: number | null) {
    if (membershipId in jerseyDrafts) return jerseyDrafts[membershipId]!;
    return current == null ? "" : String(current);
  }

  const candidateQuery = candidateSearch.trim().toLowerCase();
  const filteredCandidates = data.rosterCandidates.filter((candidate) => {
    if (!candidateQuery) return true;
    const haystack = [
      candidate.fullName,
      candidate.email,
      candidate.schoolRole
        ? SCHOOL_ROLE_LABELS[candidate.schoolRole] ?? candidate.schoolRole
        : "",
      candidate.volleyballPosition
        ? VOLLEYBALL_POSITION_LABELS[candidate.volleyballPosition] ??
          candidate.volleyballPosition
        : "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(candidateQuery);
  });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
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
      <Header
        team={data}
        colors={colors}
        onSchoolPress={(schoolSlug) => router.push(`/schools/${schoolSlug}`)}
      />

      {data.viewer.isMember ? (
        <Text style={[styles.badge, { color: colors.primary }]}>
          You’re on this roster
          {data.viewer.role
            ? ` · ${TEAM_ROLE_LABELS[data.viewer.role] ?? data.viewer.role}`
            : ""}
        </Text>
      ) : null}

      {actionError ? (
        <Text style={{ color: colors.destructive }}>{actionError}</Text>
      ) : null}

      {data.viewer.canManage ? (
        <View style={[styles.addBox, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Add player
          </Text>
          {data.school && data.rosterCandidates.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                From school roster
              </Text>
              <TextInput
                value={candidateSearch}
                onChangeText={setCandidateSearch}
                placeholder="Search by name, email, or position"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
              />
              {filteredCandidates.length === 0 ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  No matching school roster members.
                </Text>
              ) : (
                filteredCandidates.map((candidate) => {
                  const meta = [
                    candidate.schoolRole
                      ? SCHOOL_ROLE_LABELS[candidate.schoolRole] ??
                        candidate.schoolRole
                      : null,
                    candidate.volleyballPosition
                      ? VOLLEYBALL_POSITION_LABELS[
                          candidate.volleyballPosition
                        ] ?? candidate.volleyballPosition
                      : null,
                    candidate.jerseyNumber != null
                      ? `#${candidate.jerseyNumber}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <View
                      key={candidate.userId}
                      style={[styles.candidate, { borderColor: colors.border }]}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={{ color: colors.foreground, fontWeight: "700" }}
                        >
                          {candidate.fullName}
                        </Text>
                        <Text
                          style={{ color: colors.mutedForeground, fontSize: 12 }}
                        >
                          {candidate.email}
                        </Text>
                        {meta ? (
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 12,
                            }}
                          >
                            {meta}
                          </Text>
                        ) : null}
                        <View style={styles.jerseyRow}>
                          <TextInput
                            value={candidateJerseys[candidate.userId] ?? ""}
                            onChangeText={(value) =>
                              setCandidateJerseys((prev) => ({
                                ...prev,
                                [candidate.userId]: value,
                              }))
                            }
                            placeholder="Jersey #"
                            placeholderTextColor={colors.mutedForeground}
                            keyboardType="number-pad"
                            maxLength={2}
                            style={[
                              styles.jerseyInput,
                              {
                                color: colors.foreground,
                                borderColor: colors.border,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Pressable
                        disabled={busy}
                        onPress={() =>
                          void runAction(async () => {
                            const raw =
                              candidateJerseys[candidate.userId]?.trim() ?? "";
                            await addTeamMember(slug!, {
                              userId: candidate.userId,
                              jerseyNumber: raw === "" ? null : raw,
                            });
                            setCandidateJerseys((prev) => {
                              const next = { ...prev };
                              delete next[candidate.userId];
                              return next;
                            });
                          })
                        }
                      >
                        <Text style={{ color: colors.primary, fontWeight: "700" }}>
                          Add
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}

          {!data.school ? (
            <>
              <TextInput
                value={addEmail}
                onChangeText={setAddEmail}
                placeholder="Player email"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
              />
              <TextInput
                value={addJersey}
                onChangeText={setAddJersey}
                placeholder="Jersey # (optional)"
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
              <Pressable
                disabled={busy || !addEmail.trim()}
                onPress={() =>
                  void runAction(async () => {
                    const raw = addJersey.trim();
                    await addTeamMember(slug!, {
                      email: addEmail.trim(),
                      jerseyNumber: raw === "" ? null : raw,
                    });
                    setAddEmail("");
                    setAddJersey("");
                  })
                }
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: busy || !addEmail.trim() ? 0.5 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text
                    style={{
                      color: colors.primaryForeground,
                      fontWeight: "700",
                    }}
                  >
                    Add by email
                  </Text>
                )}
              </Pressable>
            </>
          ) : data.rosterCandidates.length === 0 ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Everyone on the school roster is already on this team. Add people
              to the school first.
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Roster ({data.members.length})
      </Text>

      {data.members.length === 0 ? (
        <Text style={{ color: colors.mutedForeground }}>
          No players on this roster yet.
        </Text>
      ) : (
        data.members.map((member) => (
          <View
            key={member.membershipId}
            style={[styles.memberRow, { borderColor: colors.border }]}
          >
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {member.fullName}
                {member.isViewer ? " (you)" : ""}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                {[
                  TEAM_ROLE_LABELS[member.role] ?? member.role,
                  !member.canEditPosition && member.volleyballPosition
                    ? VOLLEYBALL_POSITION_LABELS[member.volleyballPosition] ??
                      member.volleyballPosition
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {member.canEditPosition ? (
                <VolleyballPositionChips
                  value={member.volleyballPosition}
                  onChange={(position) =>
                    void runAction(async () => {
                      await updateTeamMemberPosition(
                        slug!,
                        member.membershipId,
                        position
                      );
                    })
                  }
                  disabled={busy}
                  colors={colors}
                />
              ) : null}
              {member.canEditJersey ? (
                <View style={styles.jerseyRow}>
                  <TextInput
                    value={jerseyValue(
                      member.membershipId,
                      member.jerseyNumber
                    )}
                    onChangeText={(value) =>
                      setJerseyDrafts((prev) => ({
                        ...prev,
                        [member.membershipId]: value,
                      }))
                    }
                    placeholder="#"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    style={[
                      styles.jerseyInput,
                      {
                        color: colors.foreground,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                      },
                    ]}
                  />
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      void runAction(async () => {
                        const raw = jerseyValue(
                          member.membershipId,
                          member.jerseyNumber
                        ).trim();
                        const jerseyNumber =
                          raw === "" ? null : Number.parseInt(raw, 10);
                        await updateTeamMemberJersey(
                          slug!,
                          member.membershipId,
                          jerseyNumber
                        );
                        setJerseyDrafts((prev) => {
                          const next = { ...prev };
                          delete next[member.membershipId];
                          return next;
                        });
                      })
                    }
                  >
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>
                      Save #
                    </Text>
                  </Pressable>
                </View>
              ) : member.jerseyNumber != null ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  #{member.jerseyNumber}
                </Text>
              ) : null}
            </View>
            {member.canRemove ? (
              <Pressable
                disabled={busy}
                onPress={() =>
                  confirmRemove(member.membershipId, member.fullName)
                }
              >
                <Text style={{ color: colors.destructive, fontWeight: "700" }}>
                  Remove
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}

      {data.viewer.canManage ? (
        <View style={[styles.addBox, { borderColor: colors.destructive }]}>
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>
            Delete team
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Type the team name exactly to confirm. This cannot be undone.
          </Text>
          <TextInput
            value={deleteConfirmName}
            onChangeText={setDeleteConfirmName}
            placeholder={data.name}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
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
            disabled={busy || deleteConfirmName.trim() !== data.name.trim()}
            onPress={() =>
              Alert.alert("Delete team?", "This permanently removes the team.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () =>
                    void runAction(async () => {
                      await deleteTeam(slug!, deleteConfirmName);
                      router.replace("/teams");
                    }),
                },
              ])
            }
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.destructive,
                opacity:
                  busy || deleteConfirmName.trim() !== data.name.trim()
                    ? 0.5
                    : 1,
              },
            ]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
              Delete team
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Header({
  team,
  colors,
  onSchoolPress,
}: {
  team: TeamDetailContract;
  colors: ReturnType<typeof useThemeColors>;
  onSchoolPress: (slug: string) => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {team.name}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {team.university}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {GENDER_LABELS[team.gender] ?? team.gender}
        {" · "}
        {REGION_LABELS[team.region] ?? team.region}
        {team.season ? ` · ${team.season}` : ""}
      </Text>
      {team.isStandalone ? (
        <Text
          style={[
            styles.verify,
            {
              color:
                team.verificationStatus === "verified"
                  ? colors.primary
                  : colors.mutedForeground,
              backgroundColor: withAlpha(colors.primary, 0.08),
            },
          ]}
        >
          {TEAM_VERIFICATION_LABELS[team.verificationStatus] ??
            team.verificationStatus}
        </Text>
      ) : null}
      {team.school ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSchoolPress(team.school!.slug)}
        >
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            {team.school.name}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  header: { gap: 6 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.4 },
  meta: { fontSize: 14, lineHeight: 20 },
  verify: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },
  badge: { fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginTop: 4 },
  addBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  candidate: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  jerseyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  jerseyInput: {
    width: 64,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
});
