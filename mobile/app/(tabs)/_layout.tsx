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

import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { useThemeColors } from "~/theme/colors";

function TabLabel({
  label,
  focused,
  color,
}: {
  label: string;
  focused: boolean;
  color: ColorValue;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: 11,
        fontWeight: focused ? "700" : "600",
        marginBottom: 10,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarIconStyle: { display: "none" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Home" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          title: "Tournaments",
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Tournaments" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: "Tournaments",
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: "Teams",
          headerShown: false,
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Teams" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: "Teams",
        }}
      />
      <Tabs.Screen
        name="schools"
        options={{
          title: "Schools",
          headerShown: false,
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Schools" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: "Schools",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Profile" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: "Profile",
        }}
      />
    </Tabs>
  );
}
