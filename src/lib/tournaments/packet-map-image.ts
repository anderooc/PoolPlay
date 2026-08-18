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

const NOMINATIM_USER_AGENT = "brackt/1.0 (tournament packet PDF; contact@brackt.app)";
const MAP_ZOOM = 15;
const TILE_SIZE = 256;
const MAP_TILE_GRID = 2;

async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
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

async function fetchTileDataUri(x: number, y: number, zoom: number): Promise<string | null> {
  const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  const response = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export type PacketMapImage = {
  /** 2×2 grid of OSM tile images, row-major. */
  tileDataUris: string[];
  width: number;
  height: number;
  attribution: string;
};

/**
 * Fetch a static map preview for embedding in the tournament packet PDF.
 * Uses Nominatim geocoding and OpenStreetMap raster tiles (no API key).
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

  const centerX = lonToTileX(coords.lon, MAP_ZOOM);
  const centerY = latToTileY(coords.lat, MAP_ZOOM);
  const originX = centerX - Math.floor(MAP_TILE_GRID / 2);
  const originY = centerY - Math.floor(MAP_TILE_GRID / 2);

  const tileCoords: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < MAP_TILE_GRID; row += 1) {
    for (let col = 0; col < MAP_TILE_GRID; col += 1) {
      tileCoords.push({ x: originX + col, y: originY + row });
    }
  }

  const tileDataUris = await Promise.all(
    tileCoords.map(({ x, y }) => fetchTileDataUri(x, y, MAP_ZOOM))
  );

  if (tileDataUris.some((uri) => uri == null)) return null;

  return {
    tileDataUris: tileDataUris as string[],
    width: TILE_SIZE * MAP_TILE_GRID,
    height: TILE_SIZE * MAP_TILE_GRID,
    attribution: "© OpenStreetMap contributors",
  };
}
