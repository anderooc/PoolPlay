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

import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { useThemeColors } from "~/theme/colors";

export const authStyles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subheading: { fontSize: 15, lineHeight: 21 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  hint: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 14 },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonLabel: { fontSize: 16, fontWeight: "700" },
  linkRow: { alignItems: "center", marginTop: 8, gap: 12 },
  link: { fontSize: 15, fontWeight: "600" },
});

export function AuthScreen({
  children,
  scroll = false,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const colors = useThemeColors();
  const body = (
    <View style={authStyles.content}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[authStyles.screen, { backgroundColor: colors.background }]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: "center" }}>{body}</View>
      )}
    </KeyboardAvoidingView>
  );
}

export function AuthFieldLabel({
  children,
  hint,
}: {
  children: string;
  hint?: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>
        {children}
      </Text>
      {hint ? (
        <Text style={[authStyles.hint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthInput({
  style,
  ...props
}: TextInputProps & { style?: object }) {
  const colors = useThemeColors();
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      style={[
        authStyles.input,
        {
          color: colors.foreground,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function AuthLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={[authStyles.link, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}
