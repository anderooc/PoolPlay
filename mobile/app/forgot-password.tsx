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

import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { requestPasswordReset } from "~/api/endpoints";
import { MOBILE_PASSWORD_RESET_REDIRECT } from "~/auth/recovery-link";
import {
  AuthInput,
  AuthLink,
  AuthScreen,
  authStyles,
} from "~/components/auth-screen";
import { useThemeColors } from "~/theme/colors";

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && !isSubmitting;

  async function onSubmit() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await requestPasswordReset({
        email: email.trim(),
        redirectTo: MOBILE_PASSWORD_RESET_REDIRECT,
      });
      setSuccessMessage(
        result.message ??
          "If an account exists for that email, we sent a link to reset your password."
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send reset email."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <Text style={[authStyles.heading, { color: colors.foreground }]}>
        Reset password
      </Text>
      <Text style={[authStyles.subheading, { color: colors.mutedForeground }]}>
        Enter your account email and we&apos;ll send a reset link.
      </Text>

      {successMessage ? (
        <>
          <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
            {successMessage}
          </Text>
          <AuthLink label="Back to sign in" onPress={() => router.push("/sign-in")} />
        </>
      ) : (
        <>
          <AuthInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@university.edu"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
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
                style={[
                  authStyles.buttonLabel,
                  { color: colors.primaryForeground },
                ]}
              >
                Send reset link
              </Text>
            )}
          </Pressable>

          <AuthLink
            label="Remember your password? Sign in"
            onPress={() => router.push("/sign-in")}
          />
        </>
      )}
    </AuthScreen>
  );
}
