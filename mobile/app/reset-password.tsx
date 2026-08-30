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
import { ActivityIndicator, Pressable, Text } from "react-native";
import { confirmPasswordReset } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  AuthInput,
  AuthLink,
  AuthScreen,
  authStyles,
} from "~/components/auth-screen";
import { goBackOrReplace } from "~/lib/navigation";
import { LoadingScreen } from "~/tournament/screen-state";
import { useThemeColors } from "~/theme/colors";

export default function ResetPasswordScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { session, isLoading } = useSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    !isSubmitting;

  if (isLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/forgot-password" />;

  async function onSubmit() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset({ password, confirmPassword });
      goBackOrReplace(router, "/");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <Text style={[authStyles.heading, { color: colors.foreground }]}>
        Choose a new password
      </Text>
      <Text style={[authStyles.subheading, { color: colors.mutedForeground }]}>
        Enter a new password for your brackt account.
      </Text>

      <AuthInput
        value={password}
        onChangeText={setPassword}
        placeholder="New password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <AuthInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={onSubmit}
      />

      {error ? (
        <Text style={[authStyles.error, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={[
          authStyles.button,
          {
            backgroundColor: colors.primary,
            opacity: canSubmit ? 1 : 0.5,
          },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text
            style={[authStyles.buttonLabel, { color: colors.primaryForeground }]}
          >
            Update password
          </Text>
        )}
      </Pressable>

      <AuthLink
        label="Link expired? Request a new one"
        onPress={() => router.push("/forgot-password")}
      />
    </AuthScreen>
  );
}
