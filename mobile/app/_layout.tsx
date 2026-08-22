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

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "~/auth/session";
import { useThemeColors } from "~/theme/colors";

function RootStack() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Tournaments" }} />
      <Stack.Screen
        name="sign-in"
        options={{ title: "Sign in", presentation: "modal" }}
      />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen
        name="tournament/[slug]/index"
        options={{ headerBackTitle: "Tournaments" }}
      />
      <Stack.Screen
        name="tournament/[slug]/pools"
        options={{ title: "Pools", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/bracket"
        options={{ title: "Bracket", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/scoring"
        options={{ title: "Live scores", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/matches/[matchSlug]"
        options={{ headerBackTitle: "Back" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <RootStack />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
