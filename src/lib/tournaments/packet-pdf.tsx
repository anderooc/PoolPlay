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
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PacketData } from "@/lib/tournaments/packet-data";
import {
  formatPacketGeneratedAt,
  formatPacketTime,
} from "@/lib/tournaments/packet-data";

const BRAND = "#C93D2E";
const INK = "#1E293B";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const SURFACE = "#F8FAFC";
const SURFACE_ALT = "#F1F5F9";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 52,
    paddingHorizontal: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
    color: INK,
  },
  headerBand: {
    backgroundColor: BRAND,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 22,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  headerMeta: {
    fontSize: 10,
    color: "#FEE2E2",
    marginBottom: 2,
  },
  headerMetaStrong: {
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  body: {
    paddingHorizontal: 40,
  },
  locationRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
    alignItems: "flex-start",
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  locationName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  locationAddress: {
    fontSize: 10,
    color: MUTED,
    marginBottom: 8,
  },
  metaPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaPill: {
    fontSize: 8,
    color: INK,
    backgroundColor: SURFACE,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mapWrap: {
    width: 180,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  mapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 180,
    height: 180,
  },
  mapTile: {
    width: 90,
    height: 90,
  },
  mapCaption: {
    fontSize: 6.5,
    color: MUTED,
    backgroundColor: SURFACE,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND,
  },
  paragraph: {
    marginBottom: 4,
    color: INK,
  },
  notes: {
    fontSize: 9.5,
    whiteSpace: "pre-wrap",
    color: INK,
    lineHeight: 1.55,
  },
  bulletList: {
    gap: 3,
  },
  bullet: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 2,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
    color: BRAND,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  teamCol: {
    width: "50%",
    paddingRight: 8,
  },
  teamRow: {
    fontSize: 9.5,
    marginBottom: 3,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: BORDER,
  },
  table: {
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: INK,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: "#FFFFFF",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: SURFACE_ALT,
  },
  colTime: { width: "14%" },
  colCourt: { width: "12%" },
  colRound: { width: "24%" },
  colMatch: { width: "50%" },
  emptyState: {
    fontSize: 9.5,
    color: MUTED,
    fontStyle: "italic",
    padding: 10,
    backgroundColor: SURFACE,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    fontSize: 7.5,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerBrand: {
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    fontSize: 8,
  },
});

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function LocationSection({ data }: { data: PacketData }) {
  const hasMap = data.mapImage != null && data.mapImage.tileDataUris.length > 0;

  return (
    <View style={styles.locationRow}>
      <View style={styles.locationDetails}>
        <Text style={styles.locationLabel}>Venue</Text>
        <Text style={styles.locationName}>{data.location}</Text>
        {data.address ? (
          <Text style={styles.locationAddress}>{data.address}</Text>
        ) : null}
        <View style={styles.metaPills}>
          <Text style={styles.metaPill}>{data.dateDisplay}</Text>
          <Text style={styles.metaPill}>{data.genderLabel}</Text>
          <Text style={styles.metaPill}>{data.regionLabel}</Text>
          {data.hostSchoolName ? (
            <Text style={styles.metaPill}>Hosted by {data.hostSchoolName}</Text>
          ) : null}
        </View>
      </View>
      {hasMap ? (
        <View style={styles.mapWrap}>
          <View style={styles.mapGrid}>
            {data.mapImage!.tileDataUris.map((uri, index) => (
              <Image key={index} src={uri} style={styles.mapTile} />
            ))}
          </View>
          <Text style={styles.mapCaption}>{data.mapImage!.attribution}</Text>
        </View>
      ) : null}
    </View>
  );
}

function RegisteredTeams({ teams }: { teams: PacketData["registeredTeams"] }) {
  const midpoint = Math.ceil(teams.length / 2);
  const columns = [teams.slice(0, midpoint), teams.slice(midpoint)];

  return (
    <View style={styles.teamGrid}>
      {columns.map((col, colIndex) => (
        <View key={colIndex} style={styles.teamCol}>
          {col.map((team) => (
            <Text key={team.name} style={styles.teamRow}>
              {team.name}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function TournamentPacketDocument({ data }: { data: PacketData }) {
  return (
    <Document title={`${data.name} — Tournament Packet`} author="brackt">
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.headerBand}>
          <Text style={styles.headerTitle}>{data.name}</Text>
          <Text style={styles.headerMeta}>
            <Text style={styles.headerMetaStrong}>Organizer:</Text>{" "}
            {data.organizerName}
          </Text>
          <Text style={styles.headerMeta}>
            <Text style={styles.headerMetaStrong}>Live event:</Text> {data.liveUrl}
          </Text>
        </View>

        <View style={styles.body}>
          <LocationSection data={data} />

          {data.description ? (
            <Section title="Event overview">
              <Text style={styles.notes}>{data.description}</Text>
            </Section>
          ) : null}

          {data.registeredTeams.length > 0 ? (
            <Section title={`Registered teams (${data.registeredTeams.length})`}>
              <RegisteredTeams teams={data.registeredTeams} />
            </Section>
          ) : null}

          {data.packetNotes ? (
            <Section title="Logistics & day-of information">
              <Text style={styles.notes}>{data.packetNotes}</Text>
            </Section>
          ) : null}

          {data.paymentInstructions ? (
            <Section title="Entry fees & payment">
              <Text style={styles.notes}>{data.paymentInstructions}</Text>
            </Section>
          ) : null}

          <Section title="Competition rules — pool play">
            <View style={styles.bulletList}>
              <Bullet>Format: {data.playFormatLabel}</Bullet>
              <Bullet>Match format: {data.poolRules.matchFormatLabel}</Bullet>
              <Bullet>
                Pool sets start at {data.poolRules.setStartingScore}–
                {data.poolRules.setStartingScore}, play to{" "}
                {data.poolRules.setTargetScore}
                {data.poolRules.matchFormat === "two_with_tiebreak"
                  ? ` (tiebreak to ${data.poolRules.tiebreakTargetScore})`
                  : ""}
              </Bullet>
              <Bullet>Warmup: {data.poolRules.warmupFormatLabel}</Bullet>
            </View>
            {data.poolRules.tiebreakCriteria.length > 0 ? (
              <Text style={[styles.paragraph, { marginTop: 6, fontSize: 9.5 }]}>
                Pool standings tiebreaks (in order):{" "}
                {data.poolRules.tiebreakCriteria.join(" → ")}
              </Text>
            ) : null}
          </Section>

          {data.bracketRules ? (
            <Section title="Competition rules — bracket play">
              <Text style={styles.paragraph}>{data.bracketRules.summary}</Text>
              <View style={[styles.bulletList, { marginTop: 6 }]}>
                <Bullet>
                  Match format: {data.poolRules.matchFormatLabel} (same as pool
                  play)
                </Bullet>
                <Bullet>Warmup: {data.poolRules.warmupFormatLabel}</Bullet>
              </View>
            </Section>
          ) : null}

          <Section title="Match schedule">
            {data.schedule.length === 0 ? (
              <Text style={styles.emptyState}>
                Schedule will be published on brackt — check the live event page
                for updates.
              </Text>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.colTime}>Time</Text>
                  <Text style={styles.colCourt}>Court</Text>
                  <Text style={styles.colRound}>Round</Text>
                  <Text style={styles.colMatch}>Matchup</Text>
                </View>
                {data.schedule.map((row, i) => (
                  <View
                    key={i}
                    style={[
                      styles.tableRow,
                      ...(i % 2 === 1 ? [styles.tableRowAlt] : []),
                    ]}
                  >
                    <Text style={styles.colTime}>
                      {formatPacketTime(row.scheduledTime)}
                    </Text>
                    <Text style={styles.colCourt}>{row.courtName ?? "—"}</Text>
                    <Text style={styles.colRound}>{row.roundLabel}</Text>
                    <Text style={styles.colMatch}>
                      {row.teamAName} vs {row.teamBName}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Section>
        </View>

        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerBrand}>brackt</Text>
            <Text>
              Generated {formatPacketGeneratedAt(data.generatedAt)} · Rules and
              schedule reflect settings at generation time.
            </Text>
          </View>
          <Text>{data.liveUrl}</Text>
        </View>
      </Page>
    </Document>
  );
}
