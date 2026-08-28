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
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No matches yet
        </Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          Public matches appear here once the host releases pools or brackets.
        </Text>
      </View>
    );
  }

  const groups = groupMatches(matches);
  const liveCount = matches.filter((m) => m.status === "in_progress").length;

  return (
    <View style={styles.stack}>
      <Text style={[styles.summary, { color: colors.mutedForeground }]}>
        {matches.length} match{matches.length === 1 ? "" : "es"}
        {liveCount > 0 ? ` · ${liveCount} live` : ""}
      </Text>
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.foreground }]}>
            {group.title}
          </Text>
          {group.subtitle ? (
            <Text style={[styles.groupSubtitle, { color: colors.mutedForeground }]}>
              {group.subtitle}
            </Text>
          ) : null}
          <View style={styles.rows}>
            {group.matches.map((match) => (
              <MatchRow
                key={match.slug}
                match={match}
                onPress={() =>
                  router.push(
                    `/tournament/${tournamentSlug}/matches/${match.slug}`
                  )
                }
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function groupMatches(matches: TournamentMatchContract[]) {
  const map = new Map<
    string,
    {
      key: string;
      title: string;
      subtitle: string | null;
      matches: TournamentMatchContract[];
    }
  >();

  for (const match of matches) {
    const division = match.divisionName ?? "Tournament";
    const phaseLabel = match.phase === "bracket" ? "Bracket" : "Pool play";
    const key = `${division}::${match.phase}`;
    const existing = map.get(key);
    if (existing) {
      existing.matches.push(match);
    } else {
      map.set(key, {
        key,
        title: division,
        subtitle: phaseLabel,
        matches: [match],
      });
    }
  }

  return Array.from(map.values());
}

const styles = StyleSheet.create({
  stack: { gap: 22 },
  summary: { fontSize: 14, fontWeight: "600" },
  group: { gap: 8 },
  groupTitle: { fontSize: 15, fontWeight: "700" },
  groupSubtitle: { fontSize: 13, fontWeight: "600", marginTop: -4 },
  rows: { gap: 10 },
  empty: { gap: 8, paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 15, lineHeight: 22 },
});
