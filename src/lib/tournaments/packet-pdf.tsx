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
import type { PacketData, PacketScheduleRow } from "@/lib/tournaments/packet-data";
import {
  formatPacketGeneratedAt,
  formatPacketTime,
} from "@/lib/tournaments/packet-data";

// ---------------------------------------------------------------------------
// Color constants (accent = data.accentColor at runtime — passed as props)
// ---------------------------------------------------------------------------
const INK = "#1E293B";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const SURFACE = "#F8FAFC";
const SURFACE_ALT = "#F1F5F9";
const WHITE = "#FFFFFF";

// ---------------------------------------------------------------------------
// Static styles (accent-independent)
// ---------------------------------------------------------------------------
const S = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
    color: INK,
  },
  // The fixed header on continuation pages — provides top breathing room
  continuationBand: {
    height: 18,
    marginBottom: 14,
  },
  headerBand: {
    paddingHorizontal: 40,
    paddingTop: 0,
    paddingBottom: 0,
  },
  // Top portion: large date + tournament name
  headerTop: {
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 40,
  },
  headerDate: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    opacity: 0.9,
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: -0.5,
    lineHeight: 1.2,
  },
  // Bottom strip of header: organizer + link on a slightly darker tint
  headerBottom: {
    paddingHorizontal: 40,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerMeta: {
    fontSize: 9,
    color: WHITE,
    opacity: 0.8,
    marginBottom: 1,
  },
  headerMetaStrong: {
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    opacity: 1,
  },
  body: {
    paddingHorizontal: 40,
  },
  // Venue row: details left, map right
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
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.7,
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
    gap: 5,
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
    width: 170,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  mapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 170,
    height: 170,
  },
  mapTile: {
    width: 85,
    height: 85,
  },
  mapCaption: {
    fontSize: 6,
    color: MUTED,
    backgroundColor: SURFACE,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
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
  tableSubheader: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: INK,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE_ALT,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: WHITE,
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
    fontSize: 8,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <View style={S.section}>
      <Text style={[S.sectionTitle, { borderBottomColor: accent }]}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <View style={S.bullet}>
      <Text style={[S.bulletDot, { color: accent }]}>•</Text>
      <Text style={S.bulletText}>{children}</Text>
    </View>
  );
}

function LocationSection({ data }: { data: PacketData }) {
  const hasMap = data.mapImage != null && data.mapImage.tileDataUris.length === 4;

  return (
    <View style={S.locationRow}>
      <View style={S.locationDetails}>
        <Text style={S.locationLabel}>Venue</Text>
        <Text style={S.locationName}>{data.location}</Text>
        {data.address ? (
          <Text style={S.locationAddress}>{data.address}</Text>
        ) : null}
        <View style={S.metaPills}>
          {data.hostSchoolName ? (
            <Text style={S.metaPill}>Hosted by {data.hostSchoolName}</Text>
          ) : null}
        </View>
      </View>
      {hasMap ? (
        <View style={S.mapWrap}>
          <View style={S.mapGrid}>
            {data.mapImage!.tileDataUris.map((uri, index) => (
              <Image key={index} src={uri} style={S.mapTile} />
            ))}
          </View>
          <Text style={S.mapCaption}>{data.mapImage!.attribution}</Text>
        </View>
      ) : null}
    </View>
  );
}

function RegisteredTeams({ teams }: { teams: PacketData["registeredTeams"] }) {
  const midpoint = Math.ceil(teams.length / 2);
  const columns = [teams.slice(0, midpoint), teams.slice(midpoint)];

  return (
    <View style={S.teamGrid}>
      {columns.map((col, colIndex) => (
        <View key={colIndex} style={S.teamCol}>
          {col.map((team) => (
            <Text key={team.name} style={S.teamRow}>
              {team.name}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Schedule table — pool play section
// ---------------------------------------------------------------------------

type SlotGroup = {
  /** null means all matches in this slot start at the same time — only show once */
  timeLabel: string | null;
  rows: PacketScheduleRow[];
  showTimePerRow: boolean;
};

/**
 * Group pool-play rows into time slots. If all courts in a slot start at the
 * same minute, show the time once in a slot header. If any differ, fall back
 * to per-row display.
 */
function groupPoolRows(rows: PacketScheduleRow[]): SlotGroup[] {
  if (rows.length === 0) return [];

  // Key by minute bucket
  const slotMap = new Map<string, PacketScheduleRow[]>();
  for (const row of rows) {
    const key = formatPacketTime(row.scheduledTime);
    const bucket = slotMap.get(key) ?? [];
    bucket.push(row);
    slotMap.set(key, bucket);
  }

  return Array.from(slotMap.entries()).map(([timeLabel, slotRows]) => {
    // If every row in the slot has the same time, condense to one header
    const times = new Set(slotRows.map((r) => formatPacketTime(r.scheduledTime)));
    const showOnce = times.size === 1;
    return {
      timeLabel: showOnce ? timeLabel : null,
      rows: slotRows,
      showTimePerRow: !showOnce,
    };
  });
}

function ScheduleTableHeader({ accent }: { accent: string }) {
  return (
    <View style={[S.tableHeader, { backgroundColor: accent }]}>
      <Text style={S.colTime}>Time</Text>
      <Text style={S.colCourt}>Court</Text>
      <Text style={S.colRound}>Round</Text>
      <Text style={S.colMatch}>Matchup</Text>
    </View>
  );
}

function PoolScheduleTable({
  rows,
  accent,
}: {
  rows: PacketScheduleRow[];
  accent: string;
}) {
  const groups = groupPoolRows(rows);
  let rowIndex = 0;

  return (
    <View style={S.table}>
      <ScheduleTableHeader accent={accent} />
      {groups.map((group, gi) => (
        <View key={gi}>
          {group.timeLabel ? (
            // Condensed time-slot header row
            <View style={S.tableSubheader}>
              <Text style={S.colTime}>{group.timeLabel}</Text>
              <Text style={S.colCourt}>Court</Text>
              <Text style={S.colRound}>Round</Text>
              <Text style={S.colMatch}>Matchup</Text>
            </View>
          ) : null}
          {group.rows.map((row) => {
            const alt = rowIndex % 2 === 1;
            rowIndex += 1;
            return (
              <View
                key={`${row.teamAName}-${row.teamBName}-${row.scheduledTime.toISOString()}`}
                style={[S.tableRow, alt ? S.tableRowAlt : {}]}
              >
                <Text style={S.colTime}>
                  {group.showTimePerRow ? formatPacketTime(row.scheduledTime) : ""}
                </Text>
                <Text style={S.colCourt}>{row.courtName ?? "—"}</Text>
                <Text style={S.colRound}>{row.roundLabel}</Text>
                <Text style={S.colMatch}>
                  {row.teamAName} vs {row.teamBName}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function BracketScheduleTable({
  rows,
  accent,
}: {
  rows: PacketScheduleRow[];
  accent: string;
}) {
  return (
    <View style={S.table}>
      <ScheduleTableHeader accent={accent} />
      {rows.map((row, i) => (
        <View
          key={`${row.teamAName}-${row.teamBName}-${row.scheduledTime.toISOString()}`}
          style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
        >
          <Text style={S.colTime}>{formatPacketTime(row.scheduledTime)}</Text>
          <Text style={S.colCourt}>{row.courtName ?? "—"}</Text>
          <Text style={S.colRound}>{row.roundLabel}</Text>
          <Text style={S.colMatch}>
            {row.teamAName} vs {row.teamBName}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ScheduleSection({ data }: { data: PacketData }) {
  const poolRows = data.schedule.filter((r) => r.isPool);
  const bracketRows = data.schedule.filter((r) => !r.isPool);
  const accent = data.accentColor;

  if (data.schedule.length === 0) {
    return (
      <Section title="Match schedule" accent={accent}>
        <Text style={S.emptyState}>
          Schedule will be published on brac-t.com — check the live event page
          for updates.
        </Text>
      </Section>
    );
  }

  const hasBothPhases = poolRows.length > 0 && bracketRows.length > 0;

  return (
    <Section title="Match schedule" accent={accent}>
      {poolRows.length > 0 ? (
        <View style={{ marginBottom: hasBothPhases ? 12 : 0 }}>
          {hasBothPhases ? (
            <Text
              style={{
                fontSize: 9,
                fontFamily: "Helvetica-Bold",
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 5,
              }}
            >
              Pool play
            </Text>
          ) : null}
          <PoolScheduleTable rows={poolRows} accent={accent} />
        </View>
      ) : null}
      {bracketRows.length > 0 ? (
        <View>
          {hasBothPhases ? (
            <Text
              style={{
                fontSize: 9,
                fontFamily: "Helvetica-Bold",
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 5,
              }}
            >
              Bracket play
            </Text>
          ) : null}
          <BracketScheduleTable rows={bracketRows} accent={accent} />
        </View>
      ) : null}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export function TournamentPacketDocument({ data }: { data: PacketData }) {
  const accent = data.accentColor;

  // Slightly darkened version of accent for the meta strip
  const metaStripStyle = { backgroundColor: accent, opacity: 0.85 };

  return (
    <Document title={`${data.name} — Tournament Packet`} author="brackt">
      <Page size="LETTER" style={S.page} wrap>
        {/* ---- Fixed colored band on every continuation page ---- */}
        <View
          style={[S.continuationBand, { backgroundColor: accent }]}
          fixed
          render={({ pageNumber }) =>
            pageNumber === 1 ? null : <View style={{ height: 18 }} />
          }
        />

        {/* ---- Cover header (first page only) ---- */}
        <View style={{ backgroundColor: accent }} render={({ pageNumber }) =>
          pageNumber === 1 ? (
            <>
              <View style={S.headerTop}>
                <Text style={S.headerDate}>{data.dateDisplay}</Text>
                <Text style={S.headerTitle}>{data.name}</Text>
              </View>
              <View
                style={[
                  S.headerBottom,
                  { backgroundColor: "rgba(0,0,0,0.18)" },
                ]}
              >
                <Text style={S.headerMeta}>
                  <Text style={S.headerMetaStrong}>Organizer: </Text>
                  {data.organizerName}
                  {data.hostSchoolName
                    ? ` · Hosted by ${data.hostSchoolName}`
                    : ""}
                </Text>
                <Text style={S.headerMeta}>
                  <Text style={S.headerMetaStrong}>Live event: </Text>
                  {data.liveUrl}
                </Text>
              </View>
            </>
          ) : null
        } />

        <View style={S.body}>
          <LocationSection data={data} />

          {data.description ? (
            <Section title="Event overview" accent={accent}>
              <Text style={S.notes}>{data.description}</Text>
            </Section>
          ) : null}

          {data.registeredTeams.length > 0 ? (
            <Section
              title={`Registered teams (${data.registeredTeams.length})`}
              accent={accent}
            >
              <RegisteredTeams teams={data.registeredTeams} />
            </Section>
          ) : null}

          {data.packetNotes ? (
            <Section title="Logistics & day-of information" accent={accent}>
              <Text style={S.notes}>{data.packetNotes}</Text>
            </Section>
          ) : null}

          {data.paymentInstructions ? (
            <Section title="Entry fees & payment" accent={accent}>
              <Text style={S.notes}>{data.paymentInstructions}</Text>
            </Section>
          ) : null}

          <Section title="Competition rules — pool play" accent={accent}>
            <View style={S.bulletList}>
              <Bullet accent={accent}>Format: {data.playFormatLabel}</Bullet>
              <Bullet accent={accent}>
                Match format: {data.poolRules.matchFormatLabel}
              </Bullet>
              <Bullet accent={accent}>
                Pool sets start at {data.poolRules.setStartingScore}–
                {data.poolRules.setStartingScore}, play to{" "}
                {data.poolRules.setTargetScore}
                {data.poolRules.matchFormat === "two_with_tiebreak"
                  ? ` (tiebreak to ${data.poolRules.tiebreakTargetScore})`
                  : ""}
              </Bullet>
              <Bullet accent={accent}>
                Warmup: {data.poolRules.warmupFormatLabel}
              </Bullet>
            </View>
            {data.poolRules.tiebreakCriteria.length > 0 ? (
              <Text style={[S.paragraph, { marginTop: 6, fontSize: 9.5 }]}>
                Pool standings tiebreaks (in order):{" "}
                {data.poolRules.tiebreakCriteria.join(" → ")}
              </Text>
            ) : null}
          </Section>

          {data.bracketRules ? (
            <Section title="Competition rules — bracket play" accent={accent}>
              <Text style={S.paragraph}>{data.bracketRules.summary}</Text>
              <View style={[S.bulletList, { marginTop: 6 }]}>
                <Bullet accent={accent}>
                  Match format: {data.poolRules.matchFormatLabel} (same as pool
                  play)
                </Bullet>
                <Bullet accent={accent}>
                  Warmup: {data.poolRules.warmupFormatLabel}
                </Bullet>
              </View>
            </Section>
          ) : null}

          <ScheduleSection data={data} />
        </View>

        <View style={[S.footer, { borderTopColor: BORDER }]} fixed>
          <View>
            <Text style={[S.footerBrand, { color: accent }]}>brac-t.com</Text>
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
