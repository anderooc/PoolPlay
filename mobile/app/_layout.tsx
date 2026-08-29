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
import { Platform, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "~/auth/session";
import { NotificationsRealtimeProvider } from "~/notifications/NotificationsRealtimeProvider";
import { PushNotificationProvider } from "~/notifications/PushNotificationProvider";
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
        // Keep back transitions sliding in from the left (iOS-style) on Android too.
        animation: Platform.OS === "android" ? "ios_from_right" : "default",
        animationTypeForReplace: "pop",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="sign-in"
        options={{ title: "Sign in", presentation: "modal" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: "Notifications", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="tournament/[slug]/index"
        options={{
          headerBackTitle: "Tournaments",
          // Deep-link / cold-start back uses replace("/"); pop animates from the left.
          animationTypeForReplace: "pop",
        }}
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
        name="tournament/[slug]/packet"
        options={{ title: "Packet", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/waiver"
        options={{ title: "Waiver", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/payment"
        options={{ title: "Payment", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/email"
        options={{ title: "Email", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/chat"
        options={{ title: "Chat", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/register"
        options={{ title: "Register", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/settings/pool"
        options={{ title: "Pool settings", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/settings/bracket"
        options={{ title: "Bracket settings", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/host/index"
        options={{ title: "Host", headerBackTitle: "Tournament" }}
      />
      <Stack.Screen
        name="tournament/[slug]/host/setup"
        options={{ title: "Setup", headerBackTitle: "Host" }}
      />
      <Stack.Screen
        name="tournament/[slug]/host/registrations"
        options={{ title: "Registrations", headerBackTitle: "Host" }}
      />
      <Stack.Screen
        name="tournament/[slug]/host/pools"
        options={{ title: "Pool ops", headerBackTitle: "Host" }}
      />
      <Stack.Screen
        name="tournament/[slug]/host/bracket"
        options={{ title: "Bracket ops", headerBackTitle: "Host" }}
      />
      <Stack.Screen
        name="tournament/[slug]/host/schedule"
        options={{ title: "Schedule", headerBackTitle: "Host" }}
      />
      <Stack.Screen
        name="tournament/new"
        options={{ title: "Create tournament", headerBackTitle: "Tournaments" }}
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
        <NotificationsRealtimeProvider>
          <PushNotificationProvider>
            <StatusBar style={scheme === "dark" ? "light" : "dark"} />
            <RootStack />
          </PushNotificationProvider>
        </NotificationsRealtimeProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
