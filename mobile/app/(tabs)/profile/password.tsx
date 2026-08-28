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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { changePassword } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { useThemeColors } from "~/theme/colors";
import { messageFor } from "~/tournament/use-public-loader";

export default function ChangePasswordScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (isLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  const canSubmit =
    currentPassword.length > 0 &&
    password.length >= 8 &&
    confirmPassword.length > 0;

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await changePassword({ currentPassword, password, confirmPassword });
      router.back();
    } catch (cause) {
      setError(messageFor(cause, "Could not update password."));
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
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        Enter your current password, then choose a new one.
      </Text>

      <Field
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        colors={colors}
      />
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        colors={colors}
      />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        At least 8 characters.
      </Text>
      <Field
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        colors={colors}
      />

      {error ? (
        <Text style={{ color: colors.destructive }}>{error}</Text>
      ) : null}

      <Pressable
        disabled={busy || !canSubmit}
        onPress={() => void onSubmit()}
        style={[
          styles.save,
          {
            backgroundColor: colors.primary,
            opacity: busy || !canSubmit ? 0.5 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
            Update password
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  field: { gap: 6 },
  label: { fontSize: 15, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { fontSize: 13, marginTop: -4 },
  save: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
