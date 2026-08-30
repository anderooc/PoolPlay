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
import { signUpAccount } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import {
  AuthFieldLabel,
  AuthInput,
  AuthLink,
  AuthScreen,
  authStyles,
} from "~/components/auth-screen";
import { goBackOrReplace } from "~/lib/navigation";
import { useThemeColors } from "~/theme/colors";

export default function SignUpScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { signIn } = useSession();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !isSubmitting;

  async function onSubmit() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await signUpAccount({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });
      await signIn(email.trim(), password);
      goBackOrReplace(router, "/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen scroll>
      <Text style={[authStyles.heading, { color: colors.foreground }]}>
        Create account
      </Text>
      <Text style={[authStyles.subheading, { color: colors.mutedForeground }]}>
        Create your brackt account with a school or institutional email.
      </Text>

      <AuthFieldLabel>Full name</AuthFieldLabel>
      <AuthInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Jane Smith"
        autoCapitalize="words"
        textContentType="name"
      />

      <AuthFieldLabel hint="Must be an institutional address (e.g. .edu).">
        School email
      </AuthFieldLabel>
      <AuthInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@university.edu"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
      />

      <AuthFieldLabel>Password</AuthFieldLabel>
      <AuthInput
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={onSubmit}
      />

      <Text style={[authStyles.hint, { color: colors.mutedForeground }]}>
        After signing up, add gender, position, and jersey number under Profile →
        Edit profile.
      </Text>

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
            Create account
          </Text>
        )}
      </Pressable>

      <AuthLink label="Already have an account? Sign in" onPress={() => router.push("/sign-in")} />
    </AuthScreen>
  );
}
