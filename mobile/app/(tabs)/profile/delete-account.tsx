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
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { deleteAccount } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { goBackOrReplace } from "~/lib/navigation";
import { useThemeColors } from "~/theme/colors";
import { LoadingScreen } from "~/tournament/screen-state";
import { messageFor } from "~/tournament/use-public-loader";

export default function DeleteAccountScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading, signOut } = useSession();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;

  async function onDelete() {
    if (busy) return;
    if (confirmation !== "DELETE") {
      setError('Type DELETE exactly to confirm.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAccount({ password, confirmation });
      await signOut();
      router.replace("/sign-in");
    } catch (cause) {
      setError(messageFor(cause, "Could not delete account."));
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
      <Text style={[styles.title, { color: colors.foreground }]}>
        Delete account
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        This permanently removes your account and signs you out everywhere. Team
        and tournament history you created may remain, but your personal data is
        anonymized.
      </Text>

      <Text style={[styles.label, { color: colors.foreground }]}>
        Password
      </Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Your password"
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />

      <Text style={[styles.label, { color: colors.foreground }]}>
        Type DELETE to confirm
      </Text>
      <TextInput
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        placeholder="DELETE"
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />

      {error ? (
        <Text style={{ color: colors.destructive }}>{error}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() =>
          Alert.alert(
            "Delete account?",
            "This cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => void onDelete(),
              },
            ]
          )
        }
        style={[
          styles.deleteBtn,
          {
            backgroundColor: colors.destructive,
            opacity: busy ? 0.6 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
            Delete my account
          </Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => goBackOrReplace(router, "/profile")}
        style={[styles.cancelBtn, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "600" }}>
          Cancel
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  deleteBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
});
