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
  SchoolDetailContract,
  SchoolMemberContract,
} from "@/lib/api/contracts/school";
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
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addSchoolMember,
  cancelSchoolJoin,
  fetchSchool,
  leaveSchool,
  removeSchoolMember,
  requestSchoolJoin,
  resolveSchoolJoinRequest,
  transferSchoolPresidency,
  updateSchoolMemberJersey,
  updateSchoolMemberPosition,
  updateSchoolMemberRole,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  GENDER_LABELS,
  REGION_LABELS,
  SCHOOL_ROLE_LABELS,
  SCHOOL_VERIFICATION_LABELS,
  VOLLEYBALL_POSITION_LABELS,
} from "~/lib/format";
import { VolleyballPositionChips } from "~/roster/volleyball-position-chips";
import { useThemeColors, withAlpha, type ThemeColors } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

type TabId = "roster" | "teams";

export default function SchoolDetailScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [tab, setTab] = useState<TabId>("roster");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"member" | "officer">("member");
  const [addTitle, setAddTitle] = useState("");
  const [jerseyDrafts, setJerseyDrafts] = useState<Record<string, string>>({});

  const load = useCallback(
    (signal?: AbortSignal) => fetchSchool(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh, reload } = usePublicLoader(
    load,
    "Could not load this school."
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: data?.name ?? "School",
      headerBackTitle: "Find",
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to find schools"
          onPress={() => router.replace("/schools")}
          hitSlop={8}
          style={{ paddingHorizontal: 4, paddingVertical: 6 }}
        >
          <Text
            style={{
              color: colors.primary,
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            ‹ Find
          </Text>
        </Pressable>
      ),
    });
  }, [colors.primary, data?.name, navigation, router]);

  if (sessionLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!slug) {
    return (
      <ErrorScreen
        title="School unavailable"
        message="Missing school link."
        onRetry={() => {}}
      />
    );
  }
  if (data === null && error === null) return <LoadingScreen />;
  if (!data) {
    return (
      <ErrorScreen
        title="School unavailable"
        message={error ?? "Could not load this school."}
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
    Alert.alert("Remove member", `Remove ${name} from this school?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          void runAction(async () => {
            await removeSchoolMember(slug!, membershipId);
          }),
      },
    ]);
  }

  function confirmTransferPresidency(member: SchoolMemberContract) {
    Alert.alert(
      "Transfer presidency",
      `Make ${member.fullName} the new president? You will become an officer.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          onPress: () =>
            void runAction(async () => {
              await transferSchoolPresidency(slug!, member.membershipId);
            }),
        },
      ]
    );
  }

  function jerseyValue(membershipId: string, current: number | null) {
    return (
      jerseyDrafts[membershipId] ??
      (current == null ? "" : String(current))
    );
  }

  function confirmLeave() {
    Alert.alert("Leave school", "Leave this school roster?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () =>
          void runAction(async () => {
            await leaveSchool(slug!);
            router.replace("/schools");
          }),
      },
    ]);
  }

  const rosterOfficers = data.members
    .filter((member) => member.role === "president" || member.role === "officer")
    .sort((a, b) => {
      if (a.role === "president") return -1;
      if (b.role === "president") return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  const rosterMembers = data.members
    .filter((member) => member.role === "member")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const plainOfficerCount = rosterOfficers.filter(
    (member) => member.role === "officer"
  ).length;

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
      <Header school={data} colors={colors} />

      {data.viewer.isMember ? (
        <Text style={[styles.badge, { color: colors.primary }]}>
          You’re on this roster
          {data.viewer.role
            ? ` · ${SCHOOL_ROLE_LABELS[data.viewer.role] ?? data.viewer.role}`
            : ""}
        </Text>
      ) : null}

      {data.viewer.hasPendingJoinRequest ? (
        <View style={styles.actions}>
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            Join request pending officer approval.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() =>
              void runAction(async () => {
                await cancelSchoolJoin(slug!);
              })
            }
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                Cancel request
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {data.viewer.canRequestToJoin ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            void runAction(async () => {
              await requestSchoolJoin(slug!);
            })
          }
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={{ color: colors.primaryForeground, fontWeight: "700" }}
            >
              Request to join
            </Text>
          )}
        </Pressable>
      ) : null}

      {!data.viewer.isMember &&
      !data.viewer.hasPendingJoinRequest &&
      data.viewer.joinBlockedReason ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
          {data.viewer.joinBlockedReason}
        </Text>
      ) : null}

      {data.viewer.canLeave ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={confirmLeave}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.destructive, fontWeight: "700" }}>
            Leave school
          </Text>
        </Pressable>
      ) : null}

      {actionError ? (
        <Text style={{ color: colors.destructive }}>{actionError}</Text>
      ) : null}

      <View
        style={[styles.tabs, { borderBottomColor: colors.border }]}
        accessibilityRole="tablist"
      >
        {(
          [
            { id: "roster", label: `Roster (${data.memberCount})` },
            { id: "teams", label: `Teams (${data.teams.length})` },
          ] as const
        ).map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(item.id)}
              style={[
                styles.tab,
                selected ? { borderBottomColor: colors.primary } : null,
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.primary : colors.mutedForeground,
                  fontWeight: selected ? "700" : "600",
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "roster" ? (
        <>
          {data.viewer.canManageRoster && data.joinRequests.length > 0 ? (
            <View style={styles.manageBlock}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Join requests ({data.joinRequests.length})
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                Matching school emails. Approve to add them to the roster.
              </Text>
              {data.joinRequests.map((request) => (
                <View
                  key={request.id}
                  style={[styles.memberRow, { borderColor: colors.border }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{ color: colors.foreground, fontWeight: "700" }}
                    >
                      {request.fullName}
                    </Text>
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 13 }}
                    >
                      {request.email}
                    </Text>
                  </View>
                  <View style={styles.inlineActions}>
                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        void runAction(async () => {
                          await resolveSchoolJoinRequest(
                            slug!,
                            request.id,
                            "approve"
                          );
                        })
                      }
                    >
                      <Text
                        style={{ color: colors.primary, fontWeight: "700" }}
                      >
                        Approve
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        void runAction(async () => {
                          await resolveSchoolJoinRequest(
                            slug!,
                            request.id,
                            "reject"
                          );
                        })
                      }
                    >
                      <Text
                        style={{ color: colors.destructive, fontWeight: "700" }}
                      >
                        Decline
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {data.viewer.canManageRoster ? (
            <View style={[styles.addBox, { borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Add member
              </Text>
              <TextInput
                value={addEmail}
                onChangeText={setAddEmail}
                placeholder="Email"
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
              <View style={styles.roleRow}>
                {(["member", "officer"] as const).map((role) => {
                  const selected = addRole === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => setAddRole(role)}
                      style={[
                        styles.roleChip,
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
                            : colors.mutedForeground,
                          fontWeight: "700",
                        }}
                      >
                        {SCHOOL_ROLE_LABELS[role] ?? role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {addRole === "officer" ? (
                <TextInput
                  value={addTitle}
                  onChangeText={setAddTitle}
                  placeholder="Title (optional, e.g. VP)"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={60}
                  style={[
                    styles.input,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                />
              ) : null}
              <Pressable
                disabled={busy || !addEmail.trim()}
                onPress={() =>
                  void runAction(async () => {
                    await addSchoolMember(slug!, {
                      email: addEmail.trim(),
                      role: addRole,
                      title:
                        addRole === "officer" && addTitle.trim()
                          ? addTitle.trim()
                          : null,
                    });
                    setAddEmail("");
                    setAddRole("member");
                    setAddTitle("");
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
                <Text
                  style={{ color: colors.primaryForeground, fontWeight: "700" }}
                >
                  Add to roster
                </Text>
              </Pressable>
            </View>
          ) : null}

          {data.members.length === 0 ? (
            <Text style={{ color: colors.mutedForeground }}>
              No members on the roster yet.
            </Text>
          ) : (
            <>
              {data.viewer.canManageRoster && plainOfficerCount < 1 ? (
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 13,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: withAlpha(colors.primary, 0.08),
                  }}
                >
                  Add at least one officer before submitting for verification.
                </Text>
              ) : null}
              <RosterSection
                title={`Officers (${rosterOfficers.length})`}
                emptyMessage="No officers yet."
                members={rosterOfficers}
                colors={colors}
                busy={busy}
                showPresidentLabel
                jerseyValue={jerseyValue}
                onJerseyDraftChange={(membershipId, value) =>
                  setJerseyDrafts((prev) => ({
                    ...prev,
                    [membershipId]: value,
                  }))
                }
                onJerseySave={(member) =>
                  void runAction(async () => {
                    const raw = jerseyValue(
                      member.membershipId,
                      member.jerseyNumber
                    ).trim();
                    const jerseyNumber =
                      raw === "" ? null : Number.parseInt(raw, 10);
                    await updateSchoolMemberJersey(
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
                onPositionChange={(member, position) =>
                  void runAction(async () => {
                    await updateSchoolMemberPosition(
                      slug!,
                      member.membershipId,
                      position
                    );
                  })
                }
                onMakeMember={(member) =>
                  void runAction(async () => {
                    await updateSchoolMemberRole(
                      slug!,
                      member.membershipId,
                      "member"
                    );
                  })
                }
                onTransferPresidency={confirmTransferPresidency}
                onRemove={confirmRemove}
              />
              <RosterSection
                title={`Members (${rosterMembers.length})`}
                emptyMessage="No members yet."
                members={rosterMembers}
                colors={colors}
                busy={busy}
                jerseyValue={jerseyValue}
                onJerseyDraftChange={(membershipId, value) =>
                  setJerseyDrafts((prev) => ({
                    ...prev,
                    [membershipId]: value,
                  }))
                }
                onJerseySave={(member) =>
                  void runAction(async () => {
                    const raw = jerseyValue(
                      member.membershipId,
                      member.jerseyNumber
                    ).trim();
                    const jerseyNumber =
                      raw === "" ? null : Number.parseInt(raw, 10);
                    await updateSchoolMemberJersey(
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
                onPositionChange={(member, position) =>
                  void runAction(async () => {
                    await updateSchoolMemberPosition(
                      slug!,
                      member.membershipId,
                      position
                    );
                  })
                }
                onMakeOfficer={(member) =>
                  void runAction(async () => {
                    await updateSchoolMemberRole(
                      slug!,
                      member.membershipId,
                      "officer"
                    );
                  })
                }
                onTransferPresidency={confirmTransferPresidency}
                onRemove={confirmRemove}
              />
            </>
          )}
        </>
      ) : data.teams.length === 0 ? (
        <Text style={{ color: colors.mutedForeground }}>
          No teams linked to this school yet.
        </Text>
      ) : (
        data.teams.map((team) => (
          <Pressable
            key={team.slug}
            accessibilityRole="button"
            onPress={() => router.push(`/teams/${team.slug}`)}
            style={[styles.memberRow, { borderColor: colors.border }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {team.name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                {GENDER_LABELS[team.gender] ?? team.gender}
                {" · "}
                {REGION_LABELS[team.region] ?? team.region}
                {" · "}
                {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
              </Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function RosterSection({
  title,
  emptyMessage,
  members,
  colors,
  busy,
  showPresidentLabel = false,
  jerseyValue,
  onJerseyDraftChange,
  onJerseySave,
  onPositionChange,
  onMakeOfficer,
  onMakeMember,
  onTransferPresidency,
  onRemove,
}: {
  title: string;
  emptyMessage: string;
  members: SchoolMemberContract[];
  colors: ThemeColors;
  busy: boolean;
  showPresidentLabel?: boolean;
  jerseyValue: (membershipId: string, current: number | null) => string;
  onJerseyDraftChange: (membershipId: string, value: string) => void;
  onJerseySave: (member: SchoolMemberContract) => void;
  onPositionChange: (
    member: SchoolMemberContract,
    position: string | null
  ) => void;
  onMakeOfficer?: (member: SchoolMemberContract) => void;
  onMakeMember?: (member: SchoolMemberContract) => void;
  onTransferPresidency?: (member: SchoolMemberContract) => void;
  onRemove: (membershipId: string, name: string) => void;
}) {
  return (
    <View style={styles.rosterSection}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {members.length === 0 ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
          {emptyMessage}
        </Text>
      ) : (
        members.map((member) => {
          const meta = [
            showPresidentLabel && member.role === "president"
              ? SCHOOL_ROLE_LABELS.president
              : null,
            member.title,
            !member.canEditPosition && member.volleyballPosition
              ? VOLLEYBALL_POSITION_LABELS[member.volleyballPosition] ??
                member.volleyballPosition
              : null,
            !member.canEditJersey && member.jerseyNumber != null
              ? `#${member.jerseyNumber}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");

          const roleAction =
            member.canChangeRole && onMakeOfficer ? (
              <Pressable disabled={busy} onPress={() => onMakeOfficer(member)}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Make officer
                </Text>
              </Pressable>
            ) : member.canChangeRole && onMakeMember ? (
              <Pressable disabled={busy} onPress={() => onMakeMember(member)}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Make member
                </Text>
              </Pressable>
            ) : null;

          return (
            <View
              key={member.membershipId}
              style={[styles.memberRow, { borderColor: colors.border }]}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {member.fullName}
                  {member.isViewer ? " (you)" : ""}
                </Text>
                {meta ? (
                  <Text
                    style={{ color: colors.mutedForeground, fontSize: 13 }}
                  >
                    {meta}
                  </Text>
                ) : null}
                {member.canEditPosition ? (
                  <VolleyballPositionChips
                    value={member.volleyballPosition}
                    onChange={(position) => onPositionChange(member, position)}
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
                        onJerseyDraftChange(member.membershipId, value)
                      }
                      placeholder="#"
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
                    <Pressable
                      disabled={busy}
                      onPress={() => onJerseySave(member)}
                    >
                      <Text
                        style={{ color: colors.primary, fontWeight: "700" }}
                      >
                        Save #
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
              <View style={styles.inlineActions}>
                {member.canTransferPresidencyTo && onTransferPresidency ? (
                  <Pressable
                    disabled={busy}
                    onPress={() => onTransferPresidency(member)}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>
                      President
                    </Text>
                  </Pressable>
                ) : null}
                {roleAction}
                {member.canRemove ? (
                  <Pressable
                    disabled={busy}
                    onPress={() => onRemove(member.membershipId, member.fullName)}
                  >
                    <Text
                      style={{ color: colors.destructive, fontWeight: "700" }}
                    >
                      Remove
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function Header({
  school,
  colors,
}: {
  school: SchoolDetailContract;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {school.name}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {school.university}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {GENDER_LABELS[school.gender] ?? school.gender}
        {" · "}
        {REGION_LABELS[school.region] ?? school.region}
      </Text>
      <Text
        style={[
          styles.verify,
          {
            color:
              school.verificationStatus === "verified"
                ? colors.primary
                : colors.mutedForeground,
            backgroundColor: withAlpha(colors.primary, 0.08),
          },
        ]}
      >
        {SCHOOL_VERIFICATION_LABELS[school.verificationStatus] ??
          school.verificationStatus}
      </Text>
      {school.domainHint ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          @{school.domainHint}
        </Text>
      ) : null}
      {school.websiteUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(school.websiteUrl!)}
        >
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Website
          </Text>
        </Pressable>
      ) : null}
      {school.description ? (
        <Text style={[styles.description, { color: colors.foreground }]}>
          {school.description}
        </Text>
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
  description: { fontSize: 15, lineHeight: 22, marginTop: 6 },
  badge: { fontSize: 14, fontWeight: "700" },
  actions: { gap: 10 },
  manageBlock: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  addBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rosterSection: { gap: 10 },
  jerseyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  jerseyInput: {
    width: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineActions: { gap: 10, alignItems: "flex-end" },
});
