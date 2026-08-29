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
  MatchConsoleContract,
  MatchConsoleRefCrewRole,
} from "@/lib/api/contracts/match-console";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  formatMatchTime,
  MATCH_FORMAT_LABELS,
  MATCH_PHASE_LABELS,
} from "~/lib/format";
import { type ThemeColors, withAlpha } from "~/theme/colors";

const SAVE_DEBOUNCE_MS = 1000;

export function MatchConsolePanel({
  data,
  colors,
  busy,
  onLifecycle,
  onSaveSet,
  onCrewAction,
}: {
  data: MatchConsoleContract;
  colors: ThemeColors;
  busy: boolean;
  onLifecycle: (
    action: "warmup" | "start" | "pause" | "finalize" | "reopen",
    winnerSlug?: string | null
  ) => void;
  onSaveSet: (
    setNumber: number,
    teamAScore: number,
    teamBScore: number
  ) => Promise<void>;
  onCrewAction: (
    action: "claim" | "release" | "claim_point_keeper" | "release_point_keeper",
    role?: MatchConsoleRefCrewRole
  ) => void;
}) {
  const [selectedSetNumber, setSelectedSetNumber] = useState(
    data.scoreState.currentSetNumber
  );
  const [sidesFlipped, setSidesFlipped] = useState(false);

  useEffect(() => {
    setSelectedSetNumber(data.scoreState.currentSetNumber);
  }, [data.scoreState.currentSetNumber, data.matchSlug]);

  const teamAName = data.teamA?.name ?? "Team A";
  const teamBName = data.teamB?.name ?? "Team B";
  const phase = data.derivedPhase;
  const canScore = data.permissions.canScore;
  const canRunLifecycle = data.permissions.canRunLifecycle;
  const canClaimCrewSlot = data.permissions.canClaimCrewSlot;
  const canBecomePointKeeper = data.permissions.canBecomePointKeeper;
  const crew = data.crew;
  const showCrewPanel =
    canClaimCrewSlot ||
    data.permissions.isOrganizer ||
    data.permissions.isRefMember ||
    crew.viewerSlot != null ||
    crew.pointKeeperUserId != null ||
    crew.slots.some((slot) => slot.userId != null);
  const activeEntry = data.scoreState.tracker[selectedSetNumber - 1];
  const activeTarget =
    activeEntry?.target ?? data.scoreState.currentTarget;
  const editingPastSet = selectedSetNumber < data.scoreState.currentSetNumber;
  const winnerName =
    data.winnerSlug === data.teamA?.slug
      ? teamAName
      : data.winnerSlug === data.teamB?.slug
        ? teamBName
        : null;

  const meta = [
    data.scheduledTime ? formatMatchTime(data.scheduledTime) : null,
    data.courtName,
    data.divisionName,
    MATCH_FORMAT_LABELS[data.settings.matchFormat] ?? data.settings.matchFormat,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.root}>
      <View style={[styles.card, { borderColor: colors.border }]}>
        <Text style={[styles.phase, { color: colors.primary }]}>
          {MATCH_PHASE_LABELS[phase] ?? phase}
        </Text>
        <Text style={[styles.matchup, { color: colors.foreground }]}>
          {teamAName} vs {teamBName}
        </Text>
        {meta ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
            {meta}
          </Text>
        ) : null}
        {data.refTeamName ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            Ref: {data.refTeamName}
          </Text>
        ) : null}
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          Sets {data.scoreState.setsWonA}–{data.scoreState.setsWonB}
        </Text>
      </View>

      {showCrewPanel ? (
        <View style={[styles.card, { borderColor: colors.border, gap: 10 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Ref crew check-in
          </Text>
          {!crew.isCrewComplete ? (
            <Text style={{ color: colors.destructive, fontSize: 13 }}>
              Crew incomplete — still need:{" "}
              {crew.missingRequiredRoles
                .map(
                  (role) =>
                    crew.slots.find((slot) => slot.role === role)?.label ?? role
                )
                .join(", ")}
            </Text>
          ) : null}
          {crew.pointKeeperFullName ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Point keeper:{" "}
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {crew.pointKeeperFullName}
              </Text>
            </Text>
          ) : (
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              No point keeper yet — a scorekeeper must claim that role to run
              scoring.
            </Text>
          )}
          {crew.slots.map((slot) => {
            const open = slot.userId == null;
            const mine = crew.viewerSlot === slot.role;
            return (
              <View
                key={slot.role}
                style={[
                  styles.crewRow,
                  {
                    borderColor: mine ? colors.primary : colors.border,
                    backgroundColor: mine
                      ? withAlpha(colors.primary, 0.08)
                      : "transparent",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    {slot.label}
                    {slot.required ? (
                      <Text style={{ color: colors.mutedForeground }}>
                        {" "}
                        · required
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                    {slot.fullName ?? (open ? "Open" : "—")}
                  </Text>
                </View>
                {canClaimCrewSlot && open && !crew.viewerSlot ? (
                  <Pressable
                    disabled={busy}
                    onPress={() => onCrewAction("claim", slot.role)}
                    style={[styles.crewBtn, { borderColor: colors.border }]}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                      Claim
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          <View style={styles.crewActions}>
            {crew.viewerSlot ? (
              <Pressable
                disabled={busy}
                onPress={() => onCrewAction("release")}
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  Release my slot
                </Text>
              </Pressable>
            ) : null}
            {canBecomePointKeeper ? (
              <Pressable
                disabled={busy}
                onPress={() => onCrewAction("claim_point_keeper")}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
                  I&apos;m keeping points
                </Text>
              </Pressable>
            ) : null}
            {crew.viewerIsPointKeeper ? (
              <Pressable
                disabled={busy}
                onPress={() => onCrewAction("release_point_keeper")}
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  Step down as point keeper
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {data.isBye ? (
        <Text style={{ color: colors.mutedForeground }}>
          This is a bracket bye match. No scoring is required.
        </Text>
      ) : phase === "completed" ? (
        <View style={[styles.card, { borderColor: colors.border }]}>
          <Text style={[styles.winner, { color: colors.foreground }]}>
            {winnerName ? `${winnerName} wins` : "Match complete"}
          </Text>
          {data.permissions.isOrganizer ? (
            <Pressable
              disabled={busy}
              onPress={() => onLifecycle("reopen")}
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                Reopen for corrections
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : !canRunLifecycle && !(canScore && phase === "in_progress") ? (
        <View style={[styles.card, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
            {canClaimCrewSlot || crew.viewerSlot
              ? crew.viewerSlot &&
                ["scorekeeper_1", "scorekeeper_2", "scorekeeper_3"].includes(
                  crew.viewerSlot
                ) &&
                !crew.viewerIsPointKeeper
                ? "Check in above, then claim point keeper to run scoring."
                : "Check in to a crew slot above."
              : phase === "warmup"
                ? "Warmup in progress."
                : phase === "in_progress"
                  ? "Match in progress — scores update live."
                  : phase === "paused"
                    ? "Match is paused."
                    : "Waiting for the ref crew or host to start."}
          </Text>
        </View>
      ) : phase === "paused" ? (
        <View style={[styles.card, { borderColor: colors.border, gap: 12 }]}>
          <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
            Match paused. Set scores are saved.
          </Text>
          <Pressable
            disabled={busy}
            onPress={() => onLifecycle("start")}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
              Resume match
            </Text>
          </Pressable>
        </View>
      ) : phase === "upcoming" ? (
        <View style={[styles.card, { borderColor: colors.border, gap: 10 }]}>
          <Pressable
            disabled={busy}
            onPress={() => onLifecycle("warmup")}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
              Start warmup
            </Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => onLifecycle("start")}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              Start match
            </Text>
          </Pressable>
        </View>
      ) : phase === "warmup" ? (
        <View style={[styles.card, { borderColor: colors.border, gap: 12 }]}>
          <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
            Warmup in progress. Start the match when both teams are ready.
          </Text>
          <Pressable
            disabled={busy}
            onPress={() => onLifecycle("start")}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
              Start match
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {canScore ? (
          <Scorekeeper
            key={`${data.matchSlug}-${selectedSetNumber}`}
            setNumber={selectedSetNumber}
            target={activeTarget}
            initialA={activeEntry?.teamAScore ?? data.settings.setStartingScore}
            initialB={activeEntry?.teamBScore ?? data.settings.setStartingScore}
            teamAName={teamAName}
            teamBName={teamBName}
            sidesFlipped={sidesFlipped}
            onFlipSides={() => setSidesFlipped((value) => !value)}
            editingPastSet={editingPastSet}
            disabled={busy}
            colors={colors}
            onSave={onSaveSet}
          />
          ) : null}
          {canRunLifecycle ? (
          <View style={[styles.card, { borderColor: colors.border, gap: 10 }]}>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Pause play or record the result
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                disabled={busy}
                onPress={() => onLifecycle("pause")}
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  Pause
                </Text>
              </Pressable>
              {data.teamA ? (
                <Pressable
                  disabled={busy}
                  onPress={() => onLifecycle("finalize", data.teamA!.slug)}
                  style={[styles.secondaryBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    {teamAName} wins
                  </Text>
                </Pressable>
              ) : null}
              {data.teamB ? (
                <Pressable
                  disabled={busy}
                  onPress={() => onLifecycle("finalize", data.teamB!.slug)}
                  style={[styles.secondaryBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    {teamBName} wins
                  </Text>
                </Pressable>
              ) : null}
              {data.settings.matchFormat === "best_of_2" ? (
                <Pressable
                  disabled={busy}
                  onPress={() => onLifecycle("finalize", null)}
                  style={[styles.secondaryBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    Record tie
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          ) : null}
        </>
      )}

      <View style={[styles.card, { borderColor: colors.border, gap: 8 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Sets
        </Text>
        {data.scoreState.tracker.map((entry) => {
          const selected = entry.setNumber === selectedSetNumber;
          const leftScore = sidesFlipped ? entry.teamBScore : entry.teamAScore;
          const rightScore = sidesFlipped ? entry.teamAScore : entry.teamBScore;
          return (
            <Pressable
              key={entry.setNumber}
              disabled={!canScore || phase !== "in_progress"}
              onPress={() => setSelectedSetNumber(entry.setNumber)}
              style={[
                styles.setRow,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected
                    ? withAlpha(colors.primary, 0.08)
                    : "transparent",
                },
              ]}
            >
              <Text style={{ color: colors.mutedForeground, width: 48 }}>
                Set {entry.setNumber}
                {entry.current ? " · live" : ""}
              </Text>
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: "700",
                  fontSize: 18,
                  flex: 1,
                  textAlign: "center",
                }}
              >
                {leftScore} – {rightScore}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                to {entry.target}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Scorekeeper({
  setNumber,
  target,
  initialA,
  initialB,
  teamAName,
  teamBName,
  sidesFlipped,
  onFlipSides,
  editingPastSet,
  disabled,
  colors,
  onSave,
}: {
  setNumber: number;
  target: number;
  initialA: number;
  initialB: number;
  teamAName: string;
  teamBName: string;
  sidesFlipped: boolean;
  onFlipSides: () => void;
  editingPastSet: boolean;
  disabled: boolean;
  colors: ThemeColors;
  onSave: (
    setNumber: number,
    teamAScore: number,
    teamBScore: number
  ) => Promise<void>;
}) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setA(initialA);
    setB(initialB);
    dirtyRef.current = false;
  }, [initialA, initialB, setNumber]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        setSaving(true);
        try {
          await onSave(setNumber, a, b);
          dirtyRef.current = false;
        } finally {
          setSaving(false);
        }
      })();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [a, b, onSave, setNumber]);

  function bump(team: "a" | "b", delta: number) {
    if (disabled || saving) return;
    dirtyRef.current = true;
    if (team === "a") setA((prev) => Math.max(0, prev + delta));
    else setB((prev) => Math.max(0, prev + delta));
  }

  const left = sidesFlipped
    ? { name: teamBName, value: b, team: "b" as const }
    : { name: teamAName, value: a, team: "a" as const };
  const right = sidesFlipped
    ? { name: teamAName, value: a, team: "a" as const }
    : { name: teamBName, value: b, team: "b" as const };

  return (
    <View style={[styles.card, { borderColor: colors.border, gap: 12 }]}>
      <View style={styles.scoreHeader}>
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>
          Set {setNumber} · to {target}
        </Text>
        {saving ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : null}
      </View>
      {editingPastSet ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          Editing a previous set
        </Text>
      ) : null}
      <View style={styles.scoreRow}>
        <TeamScoreColumn
          name={left.name}
          value={left.value}
          colors={colors}
          onMinus={() => bump(left.team, -1)}
          onPlus={() => bump(left.team, 1)}
          disabled={disabled || saving}
        />
        <TeamScoreColumn
          name={right.name}
          value={right.value}
          colors={colors}
          onMinus={() => bump(right.team, -1)}
          onPlus={() => bump(right.team, 1)}
          disabled={disabled || saving}
        />
      </View>
      <Pressable onPress={onFlipSides}>
        <Text style={{ color: colors.primary, fontWeight: "700", textAlign: "center" }}>
          Flip sides
        </Text>
      </Pressable>
    </View>
  );
}

function TeamScoreColumn({
  name,
  value,
  colors,
  onMinus,
  onPlus,
  disabled,
}: {
  name: string;
  value: number;
  colors: ThemeColors;
  onMinus: () => void;
  onPlus: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.teamCol}>
      <Text
        style={{ color: colors.foreground, fontWeight: "700", textAlign: "center" }}
        numberOfLines={2}
      >
        {name}
      </Text>
      <Text style={[styles.bigScore, { color: colors.foreground }]}>{value}</Text>
      <View style={styles.bumpRow}>
        <Pressable
          disabled={disabled}
          onPress={onMinus}
          style={[styles.bumpBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>
            −
          </Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={onPlus}
          style={[styles.bumpBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700" }}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  phase: { fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  matchup: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  winner: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  setRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreRow: { flexDirection: "row", gap: 12 },
  teamCol: { flex: 1, gap: 8 },
  bigScore: {
    fontSize: 48,
    fontWeight: "800",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  bumpRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  bumpBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  crewRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crewBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  crewActions: { gap: 8 },
});
