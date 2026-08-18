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

/** Candidate queries to try when geocoding (most specific first). */
export function geocodeQueryVariants(
  address: string,
  location?: string | null
): string[] {
  const trimmedAddress = address.trim();
  const trimmedLocation = (location ?? "").trim();
  const combined = buildLocationMapQuery(address, location);

  return [
    combined,
    trimmedAddress,
    trimmedLocation ? `${trimmedAddress}, ${trimmedLocation}` : null,
    trimmedLocation,
  ].filter((q): q is string => Boolean(q && q.trim().length >= 4));
}

type GeocodeResult = {
  lat: number;
  lon: number;
};

const MAP_USER_AGENT = "brackt/1.0 (tournament packet PDF; contact@brackt.app)";

async function geocodeWithNominatim(query: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url, {
    headers: {
      "User-Agent": MAP_USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(4_000),
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

async function geocodeWithPhoton(query: string): Promise<GeocodeResult | null> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": MAP_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return null;

  const body = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  const coords = body.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const [lon, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

/** Photon first — Nominatim often blocks or times out from server/datacenter IPs. */
export async function geocodeLocationQuery(
  query: string
): Promise<GeocodeResult | null> {
  return (await geocodeWithPhoton(query)) ?? (await geocodeWithNominatim(query));
}

async function geocodeAddress(
  address: string,
  location?: string | null
): Promise<GeocodeResult | null> {
  const variants = geocodeQueryVariants(address, location);
  for (const query of variants) {
    const hit = await geocodeLocationQuery(query);
    if (hit) return hit;
  }
  return null;
}

async function geocodeVenue(
  address: string | null,
  location?: string | null
): Promise<GeocodeResult | null> {
  const trimmedAddress = address?.trim() ?? "";
  const trimmedLocation = (location ?? "").trim();

  if (trimmedAddress.length >= 4) {
    const hit = await geocodeAddress(trimmedAddress, location);
    if (hit) return hit;
  }

  if (trimmedLocation.length >= 4) {
    return geocodeLocationQuery(trimmedLocation);
  }

  return null;
}

function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom);
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      2 ** zoom
  );
}

async function fetchImageDataUri(url: string): Promise<string | null> {
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

async function fetchStaticMapDataUri(
  lat: number,
  lon: number
): Promise<string | null> {
  const yandexUrl =
    `https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${lon},${lat}` +
    `&z=15&l=map&size=340,180&pt=${lon},${lat},pm2rdm`;

  const yandex = await fetchImageDataUri(yandexUrl);
  if (yandex) return yandex;

  const zoom = 15;
  const x = lonToTileX(lon, zoom);
  const y = latToTileY(lat, zoom);
  const osmUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  return fetchImageDataUri(osmUrl);
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
  const coords = await geocodeVenue(address, location);
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
