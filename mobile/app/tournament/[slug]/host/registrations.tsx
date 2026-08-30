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
  TournamentHostRegistrationContract,
  TournamentHostRegistrationsContract,
} from "@/lib/api/contracts/tournament-host";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  checkInTournamentHostRegistrations,
  confirmTournamentHostRegistrations,
  fetchTournamentHostRegistrations,
  promoteTournamentHostWaitlist,
  removeTournamentHostRegistrations,
  removeTournamentHostWaitlistEntry,
  updateTournamentHostRegistration,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { FormSubmitButton } from "~/components/create-form";
import {
  formatFeeCents,
  paymentStatusLabel,
  REGISTRATION_STATUS_LABELS,
} from "~/lib/format";
import { useThemeColors, withAlpha } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

type TabId = "checkin" | "pending" | "teams" | "waitlist";
type CheckInFilter = "all" | "ready" | "checked_in" | "blocked";

function matchesSearch(row: TournamentHostRegistrationContract, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    row.teamName.toLowerCase().includes(needle) ||
    (row.schoolName?.toLowerCase().includes(needle) ?? false) ||
    (row.divisionName?.toLowerCase().includes(needle) ?? false)
  );
}

export default function TournamentHostRegistrationsScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug, tab: tabParam } = useLocalSearchParams<{
    slug: string;
    tab?: string;
  }>();
  const [tab, setTab] = useState<TabId>("pending");
  const [payload, setPayload] =
    useState<TournamentHostRegistrationsContract | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const promoteOperationId = useRef<string | null>(null);
  const initialTabSet = useRef(false);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentHostRegistrations(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load registrations."
  );

  const registrations = payload ?? data?.registrations ?? null;

  useEffect(() => {
    if (!registrations) return;
    if (tabParam === "checkin" && registrations.canCheckIn) {
      setTab("checkin");
      initialTabSet.current = true;
      return;
    }
    if (!initialTabSet.current && registrations.canCheckIn) {
      setTab("checkin");
      initialTabSet.current = true;
    }
  }, [registrations, tabParam]);

  const pending = useMemo(
    () =>
      registrations?.registrations.filter((row) => row.status === "pending") ??
      [],
    [registrations]
  );
  const teams = useMemo(
    () =>
      registrations?.registrations.filter(
        (row) => row.status === "confirmed" || row.status === "checked_in"
      ) ?? [],
    [registrations]
  );
  const checkInTeams = useMemo(
    () =>
      registrations?.registrations.filter(
        (row) => row.status === "confirmed" || row.status === "checked_in"
      ) ?? [],
    [registrations]
  );
  const readyToCheckIn = useMemo(
    () =>
      checkInTeams.filter(
        (row) =>
          row.status === "confirmed" && !(row.waiver?.blocksCheckIn ?? false)
      ),
    [checkInTeams]
  );

  const applyPayload = useCallback(
    (next: TournamentHostRegistrationsContract) => {
      setPayload(next);
    },
    []
  );

  const runAction = useCallback(
    async (id: string, action: () => Promise<{ registrations: TournamentHostRegistrationsContract }>) => {
      setBusyId(id);
      setActionError(null);
      try {
        const result = await action();
        applyPayload(result.registrations);
      } catch (cause) {
        setActionError(messageFor(cause, "Could not update registration."));
      } finally {
        setBusyId(null);
      }
    },
    [applyPayload]
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
  if (error && !registrations) {
    return (
      <ErrorScreen
        title="Registrations unavailable"
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!registrations) return <LoadingScreen />;

  const locked = !registrations.canManage;

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
            setPayload(null);
            void refresh();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {locked ? (
        <Text style={[styles.locked, { color: colors.mutedForeground }]}>
          Registrations are read-only in the current tournament stage.
        </Text>
      ) : null}
      {actionError ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {actionError}
        </Text>
      ) : null}

      <View style={styles.tabs}>
        {(
          [
            ...(registrations.canCheckIn
              ? ([
                  [
                    "checkin",
                    `Check-in (${readyToCheckIn.length} left)`,
                  ],
                ] as const)
              : []),
            ["pending", `Pending (${pending.length})`],
            ["teams", `Teams (${teams.length})`],
            ["waitlist", `Waitlist (${registrations.waitlist.length})`],
          ] as const
        ).map(([id, label]) => {
          const selected = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => setTab(id as TabId)}
              style={[
                styles.tab,
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
                  color: selected ? colors.primary : colors.foreground,
                  fontWeight: selected ? "700" : "500",
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "checkin" && registrations.canCheckIn ? (
        <CheckInTab
          rows={checkInTeams}
          readyCount={readyToCheckIn.length}
          waiverRequired={registrations.waiverRequiredBeforeCheckIn}
          showWaiver={registrations.waiverEnabled}
          busyId={busyId}
          onCheckIn={(id) =>
            void runAction(id, () =>
              updateTournamentHostRegistration(slug, id, {
                status: "checked_in",
              }).then((result) => ({ registrations: result.registrations }))
            )
          }
          onUndoCheckIn={(id, teamName) =>
            Alert.alert("Undo check-in?", `Mark ${teamName} as not checked in?`, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Undo",
                onPress: () =>
                  void runAction(id, () =>
                    updateTournamentHostRegistration(slug, id, {
                      status: "confirmed",
                    }).then((result) => ({
                      registrations: result.registrations,
                    }))
                  ),
              },
            ])
          }
          onCheckInAll={() => {
            const ids = readyToCheckIn.map((row) => row.id);
            if (ids.length === 0) return;
            Alert.alert(
              "Check in all ready teams?",
              `${ids.length} team${ids.length === 1 ? "" : "s"} will be checked in.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Check in all",
                  onPress: () =>
                    void runAction("bulk-checkin", () =>
                      checkInTournamentHostRegistrations(slug, ids).then(
                        (result) => ({ registrations: result.registrations })
                      )
                    ),
                },
              ]
            );
          }}
          colors={colors}
        />
      ) : null}

      {tab === "pending" ? (
        <PendingTab
          rows={pending}
          locked={locked}
          busyId={busyId}
          showPayment={registrations.paymentEnabled}
          showWaiver={registrations.waiverEnabled}
          onConfirm={(id) =>
            void runAction(id, () =>
              confirmTournamentHostRegistrations(slug, [id]).then((result) => ({
                registrations: result.registrations,
              }))
            )
          }
          onReject={(id, teamName) =>
            Alert.alert("Reject registration?", `Remove ${teamName}?`, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Reject",
                style: "destructive",
                onPress: () =>
                  void runAction(id, () =>
                    removeTournamentHostRegistrations(slug, [id]).then(
                      (result) => ({ registrations: result.registrations })
                    )
                  ),
              },
            ])
          }
          colors={colors}
        />
      ) : null}

      {tab === "teams" ? (
        <TeamsTab
          rows={teams}
          divisions={registrations.divisions}
          locked={locked}
          busyId={busyId}
          showPayment={registrations.paymentEnabled}
          showWaiver={registrations.waiverEnabled}
          onAssignDivision={(id, divisionId) =>
            void runAction(id, () =>
              updateTournamentHostRegistration(slug, id, { divisionId }).then(
                (result) => ({ registrations: result.registrations })
              )
            )
          }
          colors={colors}
        />
      ) : null}

      {tab === "waitlist" ? (
        <WaitlistTab
          rows={registrations.waitlist}
          locked={locked}
          busyId={busyId}
          onPromote={() => {
            if (!promoteOperationId.current) {
              promoteOperationId.current = Crypto.randomUUID();
            }
            void runAction("promote", () =>
              promoteTournamentHostWaitlist(
                slug,
                promoteOperationId.current!
              ).then((result) => {
                promoteOperationId.current = null;
                return { registrations: result.registrations };
              })
            );
          }}
          onRemove={(id, teamName) =>
            Alert.alert("Remove from waitlist?", teamName, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Remove",
                style: "destructive",
                onPress: () =>
                  void runAction(id, () =>
                    removeTournamentHostWaitlistEntry(slug, id).then(
                      (result) => ({ registrations: result.registrations })
                    )
                  ),
              },
            ])
          }
          colors={colors}
        />
      ) : null}
    </ScrollView>
  );
}

function PendingTab({
  rows,
  locked,
  busyId,
  showPayment,
  showWaiver,
  onConfirm,
  onReject,
  colors,
}: {
  rows: TournamentHostRegistrationContract[];
  locked: boolean;
  busyId: string | null;
  showPayment: boolean;
  showWaiver: boolean;
  onConfirm: (id: string) => void;
  onReject: (id: string, teamName: string) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (rows.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        No pending registrations.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <RegistrationCard
          key={row.id}
          row={row}
          colors={colors}
          showPayment={showPayment}
          showWaiver={showWaiver}
          actions={
            locked ? null : (
              <View style={styles.actions}>
                <Pressable
                  disabled={busyId === row.id || row.payment?.blocksConfirm}
                  onPress={() => onConfirm(row.id)}
                  style={[
                    styles.action,
                    { borderColor: colors.primary },
                    row.payment?.blocksConfirm ? styles.actionDisabled : null,
                  ]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    Confirm
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busyId === row.id}
                  onPress={() => onReject(row.id, row.teamName)}
                  style={[styles.action, { borderColor: colors.destructive }]}
                >
                  <Text style={{ color: colors.destructive, fontWeight: "700" }}>
                    Reject
                  </Text>
                </Pressable>
              </View>
            )
          }
        />
      ))}
    </View>
  );
}

function TeamsTab({
  rows,
  divisions,
  locked,
  busyId,
  showPayment,
  showWaiver,
  onAssignDivision,
  colors,
}: {
  rows: TournamentHostRegistrationContract[];
  divisions: TournamentHostRegistrationsContract["divisions"];
  locked: boolean;
  busyId: string | null;
  showPayment: boolean;
  showWaiver: boolean;
  onAssignDivision: (id: string, divisionId: string | null) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (rows.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        No confirmed teams yet.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <RegistrationCard
          key={row.id}
          row={row}
          colors={colors}
          showPayment={showPayment}
          showWaiver={showWaiver}
          extra={
            divisions.length > 0 && !locked ? (
              <View style={styles.divisionRow}>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  Pool
                </Text>
                <View style={styles.chips}>
                  <Pressable
                    disabled={busyId === row.id}
                    onPress={() => onAssignDivision(row.id, null)}
                    style={[
                      styles.chip,
                      {
                        borderColor: !row.divisionId
                          ? colors.primary
                          : colors.border,
                        backgroundColor: !row.divisionId
                          ? withAlpha(colors.primary, 0.1)
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: !row.divisionId
                          ? colors.primary
                          : colors.foreground,
                        fontWeight: !row.divisionId ? "700" : "500",
                      }}
                    >
                      Unassigned
                    </Text>
                  </Pressable>
                  {divisions.map((division) => {
                    const selected = row.divisionId === division.id;
                    return (
                      <Pressable
                        key={division.id}
                        disabled={busyId === row.id}
                        onPress={() => onAssignDivision(row.id, division.id)}
                        style={[
                          styles.chip,
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
                            color: selected ? colors.primary : colors.foreground,
                            fontWeight: selected ? "700" : "500",
                          }}
                        >
                          {division.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : row.divisionName ? (
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                Pool: {row.divisionName}
              </Text>
            ) : null
          }
        />
      ))}
    </View>
  );
}

function CheckInTab({
  rows,
  readyCount,
  waiverRequired,
  showWaiver,
  busyId,
  onCheckIn,
  onUndoCheckIn,
  onCheckInAll,
  colors,
}: {
  rows: TournamentHostRegistrationContract[];
  readyCount: number;
  waiverRequired: boolean;
  showWaiver: boolean;
  busyId: string | null;
  onCheckIn: (id: string) => void;
  onUndoCheckIn: (id: string, teamName: string) => void;
  onCheckInAll: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CheckInFilter>("all");

  const checkedInCount = rows.filter((row) => row.status === "checked_in").length;
  const progress =
    rows.length === 0 ? 0 : Math.round((checkedInCount / rows.length) * 100);

  const filtered = useMemo(() => {
    return rows
      .filter((row) => matchesSearch(row, query))
      .filter((row) => {
        if (filter === "ready") {
          return (
            row.status === "confirmed" && !(row.waiver?.blocksCheckIn ?? false)
          );
        }
        if (filter === "checked_in") return row.status === "checked_in";
        if (filter === "blocked") return row.waiver?.blocksCheckIn ?? false;
        return true;
      })
      .sort((a, b) => {
        if (a.status === b.status) return a.teamName.localeCompare(b.teamName);
        if (a.status === "checked_in") return 1;
        if (b.status === "checked_in") return -1;
        return a.teamName.localeCompare(b.teamName);
      });
  }, [filter, query, rows]);

  if (rows.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        No confirmed teams to check in yet.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      <View style={[styles.checkInHero, { borderColor: colors.border }]}>
        <Text style={[styles.checkInTitle, { color: colors.foreground }]}>
          {checkedInCount} of {rows.length} checked in
        </Text>
        <View
          style={[styles.progressTrack, { backgroundColor: colors.border }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${progress}%`,
              },
            ]}
          />
        </View>
        {waiverRequired && showWaiver ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Waiver required before check-in.
          </Text>
        ) : null}
        <FormSubmitButton
          label={
            readyCount > 0
              ? `Check in all ready (${readyCount})`
              : "All ready teams checked in"
          }
          busy={busyId === "bulk-checkin"}
          disabled={readyCount === 0 || busyId === "bulk-checkin"}
          onPress={onCheckInAll}
          colors={colors}
        />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search teams, schools, pools…"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.search,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />

      <View style={styles.filterRow}>
        {(
          [
            ["all", "All"],
            ["ready", "Ready"],
            ["checked_in", "Checked in"],
            ["blocked", "Blocked"],
          ] as const
        ).map(([id, label]) => {
          const selected = filter === id;
          return (
            <Pressable
              key={id}
              onPress={() => setFilter(id)}
              style={[
                styles.filterChip,
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
                  color: selected ? colors.primary : colors.foreground,
                  fontWeight: selected ? "700" : "500",
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          No teams match this filter.
        </Text>
      ) : (
        filtered.map((row) => {
          const checkedIn = row.status === "checked_in";
          const blocked = row.waiver?.blocksCheckIn ?? false;
          const busy = busyId === row.id;
          return (
            <View
              key={row.id}
              style={[
                styles.card,
                {
                  borderColor: checkedIn ? colors.primary : colors.border,
                  backgroundColor: checkedIn
                    ? withAlpha(colors.primary, 0.06)
                    : "transparent",
                },
              ]}
            >
              <View style={styles.checkInRow}>
                <View style={styles.checkInCopy}>
                  <Text style={[styles.teamName, { color: colors.foreground }]}>
                    {row.teamName}
                  </Text>
                  {row.schoolName ? (
                    <Text
                      style={[styles.meta, { color: colors.mutedForeground }]}
                    >
                      {row.schoolName}
                    </Text>
                  ) : null}
                  {row.divisionName ? (
                    <Text
                      style={[styles.meta, { color: colors.mutedForeground }]}
                    >
                      Pool: {row.divisionName}
                    </Text>
                  ) : null}
                  {showWaiver && row.waiver ? (
                    <Text
                      style={[
                        styles.meta,
                        {
                          color: row.waiver.complete
                            ? colors.primary
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      Waiver {row.waiver.completedCount}/{row.waiver.totalCount}
                      {row.waiver.complete ? " · Complete" : ""}
                      {blocked ? " · Blocks check-in" : ""}
                    </Text>
                  ) : null}
                </View>
                {checkedIn ? (
                  <View style={styles.checkInActions}>
                    <View
                      style={[
                        styles.checkedBadge,
                        { backgroundColor: withAlpha(colors.primary, 0.12) },
                      ]}
                    >
                      <Text
                        style={{ color: colors.primary, fontWeight: "700" }}
                      >
                        ✓ In
                      </Text>
                    </View>
                    <Pressable
                      disabled={busy}
                      onPress={() => onUndoCheckIn(row.id, row.teamName)}
                      style={[styles.action, { borderColor: colors.border }]}
                    >
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontWeight: "600",
                        }}
                      >
                        Undo
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    disabled={busy || blocked}
                    onPress={() => onCheckIn(row.id)}
                    style={[
                      styles.checkInButton,
                      {
                        backgroundColor: blocked
                          ? colors.border
                          : colors.primary,
                        opacity: busy || blocked ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: blocked
                          ? colors.mutedForeground
                          : colors.primaryForeground,
                        fontWeight: "700",
                      }}
                    >
                      {busy ? "…" : "Check in"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function WaitlistTab({
  rows,
  locked,
  busyId,
  onPromote,
  onRemove,
  colors,
}: {
  rows: TournamentHostRegistrationsContract["waitlist"];
  locked: boolean;
  busyId: string | null;
  onPromote: () => void;
  onRemove: (id: string, teamName: string) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.list}>
      {!locked ? (
        <FormSubmitButton
          label="Promote next eligible team"
          busy={busyId === "promote"}
          colors={colors}
          onPress={onPromote}
        />
      ) : null}
      {rows.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          No teams on the waitlist.
        </Text>
      ) : (
        rows.map((row) => (
          <View
            key={row.id}
            style={[styles.card, { borderColor: colors.border }]}
          >
            <Text style={[styles.teamName, { color: colors.foreground }]}>
              #{row.queueRank} {row.teamName}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {row.schoolName}
            </Text>
            <Text
              style={[
                styles.meta,
                { color: row.eligible ? colors.primary : colors.mutedForeground },
              ]}
            >
              {row.eligible ? "Eligible" : "Not eligible"}
            </Text>
            {!locked ? (
              <Pressable
                disabled={busyId === row.id}
                onPress={() => onRemove(row.id, row.teamName)}
                style={[styles.action, { borderColor: colors.destructive }]}
              >
                <Text style={{ color: colors.destructive, fontWeight: "700" }}>
                  Remove
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

function RegistrationCard({
  row,
  colors,
  showPayment,
  showWaiver,
  extra,
  actions,
}: {
  row: TournamentHostRegistrationContract;
  colors: ReturnType<typeof useThemeColors>;
  showPayment: boolean;
  showWaiver: boolean;
  extra?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={[styles.teamName, { color: colors.foreground }]}>
        {row.teamName}
      </Text>
      {row.schoolName ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {row.schoolName}
        </Text>
      ) : null}
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {REGISTRATION_STATUS_LABELS[row.status] ?? row.status}
      </Text>
      {showWaiver && row.waiver ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Waiver {row.waiver.completedCount}/{row.waiver.totalCount}
          {row.waiver.complete ? " · Complete" : ""}
        </Text>
      ) : null}
      {showPayment && row.payment ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Payment {paymentStatusLabel(row.payment.status)}
          {" · "}
          {formatFeeCents(row.payment.amountCents)}
        </Text>
      ) : null}
      {extra}
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  locked: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  list: { gap: 12 },
  empty: { fontSize: 14, lineHeight: 20 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  teamName: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  action: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionDisabled: { opacity: 0.5 },
  divisionRow: { gap: 8, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  checkInHero: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  checkInTitle: { fontSize: 18, fontWeight: "800" },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  hint: { fontSize: 13, lineHeight: 18 },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  checkInRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkInCopy: { flex: 1, gap: 4 },
  checkInActions: { alignItems: "flex-end", gap: 8 },
  checkedBadge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  checkInButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
});
