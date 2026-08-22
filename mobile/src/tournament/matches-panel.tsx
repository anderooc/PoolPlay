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

import type { TournamentMatchContract } from "@/lib/api/contracts/tournament";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { MatchRow } from "~/tournament/match-row";
import { useThemeColors } from "~/theme/colors";

export function TournamentMatchesPanel({
  matches,
  tournamentSlug,
}: {
  matches: TournamentMatchContract[];
  tournamentSlug: string;
}) {
  const colors = useThemeColors();
  const router = useRouter();

  if (matches.length === 0) {
    return (
      <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
        No public matches yet. Scores appear here once the host releases
        pools or brackets.
      </Text>
    );
  }

  return (
    <View style={styles.stack}>
      {matches.map((match) => (
        <MatchRow
          key={match.slug}
          match={match}
          onPress={() =>
            router.push(`/tournament/${tournamentSlug}/matches/${match.slug}`)
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
});
