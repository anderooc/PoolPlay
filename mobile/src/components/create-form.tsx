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
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useThemeColors, withAlpha, type ThemeColors } from "~/theme/colors";

export function FormField({
  label,
  hint,
  children,
  colors,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {children}
      {hint ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function FormTextInput({
  value,
  onChangeText,
  placeholder,
  colors,
  multiline,
  keyboardType,
  autoCapitalize,
  maxLength,
  editable = true,
  style,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  colors: ThemeColors;
  multiline?: boolean;
  keyboardType?:
    | "default"
    | "url"
    | "numbers-and-punctuation"
    | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words";
  maxLength?: number;
  editable?: boolean;
  style?: object;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      multiline={multiline}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
      editable={editable}
      style={[
        styles.input,
        multiline && styles.textarea,
        style,
        {
          color: colors.foreground,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
      ]}
    />
  );
}

export function ChipPicker<T extends string>({
  options,
  value,
  onChange,
  colors,
  labels,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  colors: ThemeColors;
  labels: Record<string, string>;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.chip,
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
              {labels[option] ?? option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FormSubmitButton({
  label,
  busy,
  disabled,
  onPress,
  colors,
}: {
  label: string;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      disabled={busy || disabled}
      onPress={onPress}
      style={[
        styles.submit,
        {
          backgroundColor: colors.primary,
          opacity: busy || disabled ? 0.5 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.primaryForeground} />
      ) : (
        <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 15, fontWeight: "700" },
  hint: { fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  submit: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
});
