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

import type { TournamentPaymentSettingsContract } from "@/lib/api/contracts/tournament-ops";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  fetchTournamentHostPaymentSettings,
  updateTournamentHostPaymentSettings,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { FormField, FormTextInput } from "~/components/create-form";
import { useThemeColors } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

type PaymentDraft = {
  enabled: boolean;
  requiredBeforeConfirm: boolean;
  firstTeamFeeDollars: string;
  additionalTeamFeeDollars: string;
  venmoHandle: string;
  zelleHandle: string;
  cashappHandle: string;
  otherInstructions: string;
};

function centsToDollarInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

function draftFromSettings(settings: TournamentPaymentSettingsContract): PaymentDraft {
  return {
    enabled: settings.enabled,
    requiredBeforeConfirm: settings.requiredBeforeConfirm,
    firstTeamFeeDollars: centsToDollarInput(settings.firstTeamFeeCents),
    additionalTeamFeeDollars: centsToDollarInput(settings.additionalTeamFeeCents),
    venmoHandle: settings.venmoHandle ?? "",
    zelleHandle: settings.zelleHandle ?? "",
    cashappHandle: settings.cashappHandle ?? "",
    otherInstructions: settings.otherInstructions ?? "",
  };
}

function parseDollarToCents(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export default function PaymentSettingsScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentHostPaymentSettings(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load payment settings."
  );

  useEffect(() => {
    if (data) setDraft(draftFromSettings(data));
  }, [data]);

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
  if ((data === null || draft === null) && error === null) {
    return <LoadingScreen />;
  }
  if (!data || !draft) {
    return (
      <ErrorScreen
        title="Payment settings unavailable"
        message={error ?? "Only the tournament host can edit these settings."}
        onRetry={() => void refresh()}
      />
    );
  }

  async function onSave() {
    if (!draft || busy) return;
    setBusy(true);
    setActionError(null);
    setSaved(false);
    try {
      const firstTeamFeeCents = draft.enabled
        ? parseDollarToCents(draft.firstTeamFeeDollars)
        : null;
      const additionalTeamFeeCents = draft.enabled
        ? draft.additionalTeamFeeDollars
          ? parseDollarToCents(draft.additionalTeamFeeDollars)
          : firstTeamFeeCents
        : null;
      await updateTournamentHostPaymentSettings(slug!, {
        enabled: draft.enabled,
        requiredBeforeConfirm: draft.requiredBeforeConfirm,
        firstTeamFeeCents,
        additionalTeamFeeCents,
        venmoHandle: draft.venmoHandle,
        zelleHandle: draft.zelleHandle,
        cashappHandle: draft.cashappHandle,
        otherInstructions: draft.otherInstructions,
      });
      setSaved(true);
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Could not save payment settings."));
    } finally {
      setBusy(false);
    }
  }

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
          Payment settings
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Track entry fees per team. Teams pay you directly — brackt does not
          process payments.
        </Text>

        <SwitchRow
          label="Require entry fees"
          hint="Show payment instructions and track status per registration."
          value={draft.enabled}
          onValueChange={(enabled) =>
            setDraft((prev) => (prev ? { ...prev, enabled } : prev))
          }
          colors={colors}
        />

        {draft.enabled ? (
          <>
            <SwitchRow
              label="Block confirmation until paid"
              hint="Teams stay pending until you confirm or waive payment."
              value={draft.requiredBeforeConfirm}
              onValueChange={(requiredBeforeConfirm) =>
                setDraft((prev) =>
                  prev ? { ...prev, requiredBeforeConfirm } : prev
                )
              }
              colors={colors}
            />

            <FormField label="First team fee ($)" colors={colors}>
              <FormTextInput
                value={draft.firstTeamFeeDollars}
                onChangeText={(firstTeamFeeDollars) =>
                  setDraft((prev) =>
                    prev ? { ...prev, firstTeamFeeDollars } : prev
                  )
                }
                keyboardType="decimal-pad"
                placeholder="150"
                colors={colors}
              />
            </FormField>

            <FormField
              label="Additional team fee ($)"
              hint="Leave blank to match the first-team fee."
              colors={colors}
            >
              <FormTextInput
                value={draft.additionalTeamFeeDollars}
                onChangeText={(additionalTeamFeeDollars) =>
                  setDraft((prev) =>
                    prev ? { ...prev, additionalTeamFeeDollars } : prev
                  )
                }
                keyboardType="decimal-pad"
                placeholder="Same as first team"
                colors={colors}
              />
            </FormField>

            <FormField label="Venmo" colors={colors}>
              <FormTextInput
                value={draft.venmoHandle}
                onChangeText={(venmoHandle) =>
                  setDraft((prev) => (prev ? { ...prev, venmoHandle } : prev))
                }
                autoCapitalize="none"
                placeholder="@handle"
                colors={colors}
              />
            </FormField>

            <FormField label="Zelle" colors={colors}>
              <FormTextInput
                value={draft.zelleHandle}
                onChangeText={(zelleHandle) =>
                  setDraft((prev) => (prev ? { ...prev, zelleHandle } : prev))
                }
                autoCapitalize="none"
                placeholder="email or phone"
                colors={colors}
              />
            </FormField>

            <FormField label="Cash App" colors={colors}>
              <FormTextInput
                value={draft.cashappHandle}
                onChangeText={(cashappHandle) =>
                  setDraft((prev) =>
                    prev ? { ...prev, cashappHandle } : prev
                  )
                }
                autoCapitalize="none"
                placeholder="$cashtag"
                colors={colors}
              />
            </FormField>

            <FormField label="Other instructions" colors={colors}>
              <FormTextInput
                value={draft.otherInstructions}
                onChangeText={(otherInstructions) =>
                  setDraft((prev) =>
                    prev ? { ...prev, otherInstructions } : prev
                  )
                }
                multiline
                placeholder="Check payable to…"
                colors={colors}
              />
            </FormField>
          </>
        ) : null}

        {actionError ? (
          <Text style={{ color: colors.destructive }}>{actionError}</Text>
        ) : null}
        {saved ? (
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Saved.
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void onSave()}
          style={[
            styles.save,
            { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
              Save payment settings
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
  colors,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchCopy}>
        <Text style={[styles.switchLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.card}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 21 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchCopy: { flex: 1, gap: 4 },
  switchLabel: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 13, lineHeight: 18 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  save: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 14,
  },
});
