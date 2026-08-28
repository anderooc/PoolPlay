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

import type { TournamentDetailContract } from "@/lib/api/contracts/tournament";
import type { TournamentParticipationContract } from "@/lib/api/contracts/tournament-ops";
import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  DIVISION_FORMAT_LABELS,
  formatCalendarDate,
  formatDeadline,
  GENDER_LABELS,
  REGION_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "~/lib/format";
import { useThemeColors, type ThemeColors } from "~/theme/colors";

export function TournamentOverview({
  tournament,
  participation,
}: {
  tournament: TournamentDetailContract;
  participation: TournamentParticipationContract | null;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  const status =
    TOURNAMENT_STATUS_LABELS[tournament.status] ?? tournament.status;
  const gender = GENDER_LABELS[tournament.gender] ?? tournament.gender;
  const region = REGION_LABELS[tournament.region] ?? tournament.region;

  const alreadyEntered = (participation?.myTeams.length ?? 0) > 0;
  const showRegister =
    tournament.registrationOpen &&
    !alreadyEntered &&
    (participation == null || participation.canRegister);

  return (
    <View style={styles.stack}>
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.primary }]}>
          {formatCalendarDate(tournament.date)}
        </Text>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          accessibilityRole="header"
        >
          {tournament.name}
        </Text>
        <Venue tournament={tournament} colors={colors} />
        {tournament.hostSchool ? (
          <Text style={[styles.host, { color: colors.secondary }]}>
            Hosted by {tournament.hostSchool.name}
          </Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Organized by {tournament.organizerName}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {status} · {gender} · {region}
        </Text>
      </View>

      <PlayLinks slug={tournament.slug} colors={colors} />

      {participation?.isOrganizer ? (
        <HostLinks slug={tournament.slug} colors={colors} />
      ) : null}

      {participation ? (
        <OpsLinks
          slug={tournament.slug}
          access={participation.access}
          colors={colors}
        />
      ) : null}

      {alreadyEntered ? (
        <View style={[styles.entered, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Your teams
          </Text>
          {participation!.myTeams.map((team) => (
            <Text
              key={team.slug}
              style={[styles.enteredRow, { color: colors.mutedForeground }]}
            >
              {team.name}
              {" · "}
              {team.status === "waitlisted"
                ? "Waitlisted"
                : team.status === "pending"
                  ? "Pending"
                  : team.status === "checked_in"
                    ? "Checked in"
                    : "Confirmed"}
            </Text>
          ))}
        </View>
      ) : null}

      <Availability tournament={tournament} colors={colors} />

      {showRegister ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Register a team"
          onPress={() =>
            router.push(`/tournament/${tournament.slug}/register`)
          }
          style={[styles.register, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.registerLabel, { color: colors.primaryForeground }]}>
            Register team
          </Text>
        </Pressable>
      ) : null}

      {tournament.description ? (
        <Text style={[styles.description, { color: colors.foreground }]}>
          {tournament.description}
        </Text>
      ) : null}

      <Divisions tournament={tournament} colors={colors} />
    </View>
  );
}

function Venue({
  tournament,
  colors,
}: {
  tournament: TournamentDetailContract;
  colors: ThemeColors;
}) {
  const query = [tournament.location, tournament.address]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${tournament.location} in Maps`}
      onPress={() =>
        void Linking.openURL(
          `https://maps.apple.com/?q=${encodeURIComponent(query)}`
        )
      }
    >
      <Text style={[styles.meta, { color: colors.secondary }]}>
        {tournament.location}
      </Text>
      {tournament.address ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {tournament.address}
        </Text>
      ) : null}
    </Pressable>
  );
}

function PlayLinks({
  slug,
  colors,
}: {
  slug: string;
  colors: ThemeColors;
}) {
  const router = useRouter();
  const links = [
    {
      href: `/tournament/${slug}/pools` as const,
      title: "Pools",
      detail: "Standings and group matches",
    },
    {
      href: `/tournament/${slug}/bracket` as const,
      title: "Bracket",
      detail: "Elimination rounds",
    },
    {
      href: `/tournament/${slug}/scoring` as const,
      title: "Live scores",
      detail: "What's on court now",
    },
  ];

  return (
    <View style={styles.play}>
      {links.map((link) => (
        <Pressable
          key={link.href}
          accessibilityRole="button"
          accessibilityLabel={`${link.title}. ${link.detail}`}
          onPress={() => router.push(link.href)}
          style={[styles.playRow, { borderColor: colors.border }]}
        >
          <View style={styles.playText}>
            <Text style={[styles.playTitle, { color: colors.foreground }]}>
              {link.title}
            </Text>
            <Text style={[styles.playDetail, { color: colors.mutedForeground }]}>
              {link.detail}
            </Text>
          </View>
          <Text style={[styles.playChevron, { color: colors.primary }]}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function HostLinks({
  slug,
  colors,
}: {
  slug: string;
  colors: ThemeColors;
}) {
  const router = useRouter();
  const links = [
    {
      href: `/tournament/${slug}/settings/pool` as const,
      title: "Pool settings",
      detail: "Match format, scoring, and tie-breaks",
    },
    {
      href: `/tournament/${slug}/settings/bracket` as const,
      title: "Bracket settings",
      detail: "Gold / silver / bronze structure",
    },
  ];

  return (
    <View style={styles.play}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Host tools
      </Text>
      {links.map((link) => (
        <Pressable
          key={link.href}
          accessibilityRole="button"
          accessibilityLabel={`${link.title}. ${link.detail}`}
          onPress={() => router.push(link.href)}
          style={[styles.playRow, { borderColor: colors.border }]}
        >
          <View style={styles.playText}>
            <Text style={[styles.playTitle, { color: colors.foreground }]}>
              {link.title}
            </Text>
            <Text style={[styles.playDetail, { color: colors.mutedForeground }]}>
              {link.detail}
            </Text>
          </View>
          <Text style={[styles.playChevron, { color: colors.primary }]}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function OpsLinks({
  slug,
  access,
  colors,
}: {
  slug: string;
  access: TournamentParticipationContract["access"];
  colors: ThemeColors;
}) {
  const router = useRouter();
  const links = [
    access.packet
      ? {
          href: `/tournament/${slug}/packet` as const,
          title: "Packet",
          detail: "Rules, schedule, and logistics PDF",
        }
      : null,
    access.waiver
      ? {
          href: `/tournament/${slug}/waiver` as const,
          title: "Waiver",
          detail: "Download and complete team waivers",
        }
      : null,
    access.payment
      ? {
          href: `/tournament/${slug}/payment` as const,
          title: "Payment",
          detail: "Fee instructions and payment status",
        }
      : null,
    access.email
      ? {
          href: `/tournament/${slug}/email` as const,
          title: "Email",
          detail: "Message registered captains",
        }
      : null,
    access.chat
      ? {
          href: `/tournament/${slug}/chat` as const,
          title: "Chat",
          detail: "Announcements and team discussion",
        }
      : null,
  ].filter(Boolean) as {
    href: `/tournament/${string}/packet` | `/tournament/${string}/waiver` | `/tournament/${string}/payment` | `/tournament/${string}/email` | `/tournament/${string}/chat`;
    title: string;
    detail: string;
  }[];

  if (links.length === 0) return null;

  return (
    <View style={styles.play}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Team tools
      </Text>
      {links.map((link) => (
        <Pressable
          key={link.href}
          accessibilityRole="button"
          accessibilityLabel={`${link.title}. ${link.detail}`}
          onPress={() => router.push(link.href)}
          style={[styles.playRow, { borderColor: colors.border }]}
        >
          <View style={styles.playText}>
            <Text style={[styles.playTitle, { color: colors.foreground }]}>
              {link.title}
            </Text>
            <Text style={[styles.playDetail, { color: colors.mutedForeground }]}>
              {link.detail}
            </Text>
          </View>
          <Text style={[styles.playChevron, { color: colors.primary }]}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Availability({
  tournament,
  colors,
}: {
  tournament: TournamentDetailContract;
  colors: ThemeColors;
}) {
  const availability = tournament.registrationAvailability;
  const spotsLeft =
    availability.capacity === null
      ? null
      : Math.max(0, availability.capacity - availability.registeredCount);

  const facts: { label: string; value: string }[] = [
    { label: "Registered", value: String(availability.registeredCount) },
  ];
  if (spotsLeft !== null) {
    facts.push({ label: "Spots left", value: String(spotsLeft) });
  }
  if (availability.waitlistCount > 0) {
    facts.push({
      label: "Waitlist",
      value: String(availability.waitlistCount),
    });
  }
  if (availability.deadline) {
    facts.push({
      label: "Deadline",
      value: formatDeadline(availability.deadline),
    });
  }

  return (
    <View style={[styles.facts, { borderColor: colors.border }]}>
      {facts.map((fact) => (
        <View key={fact.label} style={styles.fact}>
          <Text style={[styles.factValue, { color: colors.foreground }]}>
            {fact.value}
          </Text>
          <Text style={[styles.factLabel, { color: colors.mutedForeground }]}>
            {fact.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Divisions({
  tournament,
  colors,
}: {
  tournament: TournamentDetailContract;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.divisions}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Divisions
      </Text>
      {tournament.divisions.length === 0 ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
          Divisions have not been posted yet. Check back closer to the event.
        </Text>
      ) : (
        tournament.divisions.map((division) => (
          <View key={division.name} style={styles.divisionRow}>
            <View style={styles.divisionText}>
              <Text style={[styles.divisionName, { color: colors.foreground }]}>
                {division.name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                {DIVISION_FORMAT_LABELS[division.format] ?? division.format}
              </Text>
            </View>
            <Text style={[styles.released, { color: colors.mutedForeground }]}>
              {division.poolsReleased ? "Pools posted" : "Pools not posted"}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 24 },
  header: { gap: 6 },
  date: { fontSize: 14, fontWeight: "700" },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.4 },
  meta: { fontSize: 15 },
  host: { fontSize: 15, fontWeight: "600" },
  play: { gap: 8 },
  playRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  playText: { flex: 1, gap: 2 },
  playTitle: { fontSize: 16, fontWeight: "700" },
  playDetail: { fontSize: 14 },
  playChevron: { fontSize: 28, fontWeight: "300", lineHeight: 28 },
  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 16,
    gap: 20,
  },
  fact: { minWidth: 72 },
  factValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  factLabel: { fontSize: 13, marginTop: 2 },
  register: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  registerLabel: { fontSize: 16, fontWeight: "700" },
  entered: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  enteredRow: { fontSize: 15, lineHeight: 22 },
  description: { fontSize: 16, lineHeight: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  divisions: { gap: 4 },
  divisionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
  },
  divisionText: { flex: 1, gap: 2 },
  divisionName: { fontSize: 16, fontWeight: "600" },
  released: { fontSize: 13, paddingTop: 2 },
});
