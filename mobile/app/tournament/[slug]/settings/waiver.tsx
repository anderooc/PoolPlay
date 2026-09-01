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

import type { TournamentWaiverSettingsContract } from "@/lib/api/contracts/tournament-ops";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
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
  fetchTournamentWaiver,
  updateTournamentHostWaiverSettings,
  uploadTournamentHostWaiverPdf,
} from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { FormField, FormTextInput } from "~/components/create-form";
import { useThemeColors } from "~/theme/colors";
import { ErrorScreen, LoadingScreen } from "~/tournament/screen-state";
import { messageFor, usePublicLoader } from "~/tournament/use-public-loader";

export default function WaiverSettingsScreen() {
  const colors = useThemeColors();
  const { session, isLoading: sessionLoading } = useSession();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [draft, setDraft] = useState<TournamentWaiverSettingsContract | null>(
    null
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) => fetchTournamentWaiver(slug ?? "", signal),
    [slug]
  );
  const { data, error, isRefreshing, refresh } = usePublicLoader(
    load,
    "Could not load waiver settings."
  );

  useEffect(() => {
    if (!data || !data.isOrganizer) return;
    setDraft(data.settings);
    setFileName(data.fileName);
    setVersion(data.version);
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
  if (!data?.isOrganizer || !draft) {
    return (
      <ErrorScreen
        title="Waiver settings unavailable"
        message={error ?? "Only the tournament host can edit these settings."}
        onRetry={() => void refresh()}
      />
    );
  }

  async function onUpload() {
    if (uploading) return;
    setUploading(true);
    setActionError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const file = new File(asset.uri);
      const base64 = await file.base64();
      const result = await uploadTournamentHostWaiverPdf(slug!, {
        base64,
        fileName: asset.name,
      });
      setFileName(result.waiver.fileName);
      setVersion(result.waiver.version);
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Could not upload waiver PDF."));
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    if (!draft || busy) return;
    setBusy(true);
    setActionError(null);
    setSaved(false);
    try {
      await updateTournamentHostWaiverSettings(slug!, draft);
      setSaved(true);
      await refresh();
    } catch (cause) {
      setActionError(messageFor(cause, "Could not save waiver settings."));
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
          Waiver settings
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Upload the waiver PDF and choose how teams complete it.
        </Text>

        <View style={styles.uploadBlock}>
          <Text style={[styles.section, { color: colors.foreground }]}>
            Waiver PDF
          </Text>
          {fileName ? (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              v{version} · {fileName}
            </Text>
          ) : (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              No waiver uploaded yet
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={uploading}
            onPress={() => void onUpload()}
            style={[
              styles.uploadBtn,
              {
                borderColor: colors.border,
                opacity: uploading ? 0.6 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              {uploading ? "Uploading…" : fileName ? "Upload new version" : "Upload PDF"}
            </Text>
          </Pressable>
        </View>

        <SwitchRow
          label="Require waiver"
          hint="Registered teams must complete the waiver before play."
          value={draft.enabled}
          onValueChange={(enabled) =>
            setDraft((prev) => (prev ? { ...prev, enabled } : prev))
          }
          colors={colors}
        />

        {draft.enabled ? (
          <>
            <SwitchRow
              label="Download and print"
              value={draft.allowDownloadPrint}
              onValueChange={(allowDownloadPrint) =>
                setDraft((prev) =>
                  prev ? { ...prev, allowDownloadPrint } : prev
                )
              }
              colors={colors}
            />
            <SwitchRow
              label="Third-party signing link"
              value={draft.allowThirdParty}
              onValueChange={(allowThirdParty) =>
                setDraft((prev) =>
                  prev ? { ...prev, allowThirdParty } : prev
                )
              }
              colors={colors}
            />
            {draft.allowThirdParty ? (
              <FormField label="Third-party URL (HTTPS)" colors={colors}>
                <FormTextInput
                  value={draft.thirdPartyUrl ?? ""}
                  onChangeText={(thirdPartyUrl) =>
                    setDraft((prev) =>
                      prev ? { ...prev, thirdPartyUrl } : prev
                    )
                  }
                  autoCapitalize="none"
                  keyboardType="url"
                  placeholder="https://…"
                  colors={colors}
                />
              </FormField>
            ) : null}
            <SwitchRow
              label="In-app acknowledgment"
              hint="Each player signs digitally in brackt."
              value={draft.allowDigitalAck}
              onValueChange={(allowDigitalAck) =>
                setDraft((prev) =>
                  prev ? { ...prev, allowDigitalAck } : prev
                )
              }
              colors={colors}
            />
            <SwitchRow
              label="Block check-in until complete"
              value={draft.requiredBeforeCheckIn}
              onValueChange={(requiredBeforeCheckIn) =>
                setDraft((prev) =>
                  prev ? { ...prev, requiredBeforeCheckIn } : prev
                )
              }
              colors={colors}
            />
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
              Save waiver settings
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
  section: { fontSize: 16, fontWeight: "600" },
  uploadBlock: { gap: 8 },
  uploadBtn: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
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
