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

import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fetchTournamentParticipation } from "~/api/endpoints";
import { useSession } from "~/auth/session";
import { useThemeColors } from "~/theme/colors";

export function HostSettingsEntry({
  slug,
  href,
  title,
  detail,
}: {
  slug: string;
  href: Href;
  title: string;
  detail: string;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  const { session } = useSession();
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!session || !slug) {
      setIsHost(false);
      return;
    }
    const controller = new AbortController();
    fetchTournamentParticipation(slug, controller.signal)
      .then((participation) => {
        if (!controller.signal.aborted) setIsHost(participation.isOrganizer);
      })
      .catch(() => {
        if (!controller.signal.aborted) setIsHost(false);
      });
    return () => controller.abort();
  }, [session, slug]);

  if (!isHost) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={() => router.push(href)}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.detail, { color: colors.mutedForeground }]}>
          {detail}
        </Text>
      </View>
      <Text style={[styles.edit, { color: colors.primary }]}>Edit</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "700" },
  detail: { fontSize: 13, lineHeight: 18 },
  edit: { fontSize: 15, fontWeight: "700" },
});
