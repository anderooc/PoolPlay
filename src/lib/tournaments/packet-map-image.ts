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

/** Matches {@link AddressMapPreview} query construction. */
export function buildLocationMapQuery(
  address: string,
  location?: string | null
): string | null {
  const trimmedAddress = address.trim();
  if (trimmedAddress.length === 0) return null;
  const trimmedLocation = (location ?? "").trim();
  return [trimmedLocation, trimmedAddress].filter(Boolean).join(", ");
}

type GeocodeResult = {
  lat: number;
  lon: number;
};

const MAP_USER_AGENT = "brackt/1.0 (tournament packet PDF; contact@brackt.app)";

async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": MAP_USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return null;

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const hit = results[0];
  if (!hit) return null;

  const lat = Number.parseFloat(hit.lat);
  const lon = Number.parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

async function fetchStaticMapDataUri(
  lat: number,
  lon: number
): Promise<string | null> {
  // Single static PNG — more reliable in react-pdf than stitching OSM tiles.
  const url =
    `https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${lon},${lat}` +
    `&z=15&l=map&size=340,180&pt=${lon},${lat},pm2rdm`;

  const response = await fetch(url, {
    headers: { "User-Agent": MAP_USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image")) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100) return null;

  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export type PacketMapImage = {
  dataUri: string;
  width: number;
  height: number;
  attribution: string;
};

/**
 * Fetch a static map preview for embedding in the tournament packet PDF.
 */
export async function fetchPacketMapImage(
  address: string | null,
  location?: string | null
): Promise<PacketMapImage | null> {
  if (!address) return null;

  const query = buildLocationMapQuery(address, location);
  if (!query) return null;

  const coords = await geocodeAddress(query);
  if (!coords) return null;

  const dataUri = await fetchStaticMapDataUri(coords.lat, coords.lon);
  if (!dataUri) return null;

  return {
    dataUri,
    width: 340,
    height: 180,
    attribution: "Map data © OpenStreetMap contributors",
  };
}
